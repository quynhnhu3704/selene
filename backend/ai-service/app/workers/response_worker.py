import json
import logging

from app.clients.llm_client import LLMClient
from app.core.config import settings
from app.core.prompts import CHAT_SYSTEM_PROMPT
from app.schemas.context import PipelineContext
from app.workers.base import BaseWorker

logger = logging.getLogger(__name__)


def _format_fallback_reply(context: PipelineContext) -> str:
    if not context.retrieved_items:
        return (
            "Selene chưa tìm thấy sản phẩm phù hợp trong dữ liệu Qdrant. "
            "Bạn cho mình biết thêm loại trang phục hoặc phong cách bạn đang tìm nhé!"
        )

    lines = ["Selene tìm thấy một số sản phẩm phù hợp cho bạn:"]
    for item in context.retrieved_items[:3]:
        name = item.product_name or item.text or f"Sản phẩm {item.id}"
        price = item.discount_price or item.original_price
        price_str = f" - {int(price):,}đ".replace(",", ".") if price else ""
        category_str = f" ({item.category_name})" if item.category_name else ""
        lines.append(f"- {name}{category_str}{price_str}")
    return "\n".join(lines)


class ResponseWorker(BaseWorker):
    """Generates the final user-facing answer using LLM and Qdrant context."""

    def __init__(self, llm_client: LLMClient) -> None:
        self.llm_client = llm_client

    async def run(self, context: PipelineContext) -> PipelineContext:
        if not self.llm_client.is_configured():
            context.reply = _format_fallback_reply(context)
            context.source = "qdrant-fallback"
            return context

        retrieved_payload = [
            {
                "product_id": item.product_id,
                "product_name": item.product_name,
                "category": item.category_name,
                "price": item.discount_price or item.original_price,
                "sizes": item.payload.get("sizes"),
                "colors": item.payload.get("colors"),
                "in_stock": item.payload.get("in_stock"),
                "description": (
                    item.description
                    or item.text
                    or item.payload.get("document")
                    or ""
                )[:500],
            }
            for item in context.retrieved_items
        ]
        user_payload = json.dumps(
            {
                "question": context.original_message,
                "rewritten_query": context.rewritten_query,
                "rewritten_queries": context.rewritten_queries,
                "matched": context.matched,
                "qdrant_results": retrieved_payload,
            },
            ensure_ascii=False,
        )

        messages = [
            {"role": item["role"], "content": item["text"]}
            for item in context.history
        ]
        messages.append({"role": "user", "content": user_payload})

        try:
            ai_reply = await self.llm_client.generate(
                messages=messages,
                system_prompt=CHAT_SYSTEM_PROMPT,
            )
            if ai_reply:
                context.reply = ai_reply
                context.source = settings.llm_provider.lower()
                return context
        except Exception as exc:
            logger.error("ResponseWorker LLM error: %s", exc)

        context.reply = _format_fallback_reply(context)
        context.source = "qdrant-fallback"
        return context
