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

        active_names_cf = [name.casefold() for name in context.active_product_names if name]
        active_ids = set(context.active_product_ids)

        def _is_active_item(item) -> bool:
            if item.product_id and item.product_id in active_ids:
                return True
            if item.product_name:
                name_cf = item.product_name.casefold()
                return any(n in name_cf or name_cf in n for n in active_names_cf)
            return False

        retrieved_payload = [
            {
                "product_id": item.product_id,
                "product_name": item.product_name,
                "category": item.category_name,
                "price": item.discount_price or item.original_price,
                "sizes": item.payload.get("sizes"),
                "colors": item.payload.get("colors"),
                "in_stock": item.payload.get("in_stock"),
                "is_active_in_conversation": _is_active_item(item),
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
                "conversation_intent": context.conversation_intent,
                "active_products_in_conversation": context.active_product_names,
                "rewritten_query": context.rewritten_query,
                "rewritten_queries": context.rewritten_queries,
                "matched": context.matched,
                "qdrant_results": retrieved_payload,
            },
            ensure_ascii=False,
        )

        messages = [
            {
                "role": "assistant" if item["role"] in ("assistant", "bot", "model") else "user",
                "content": item["text"],
            }
            for item in context.history
        ]
        messages.append({"role": "user", "content": user_payload})

        system_prompt = CHAT_SYSTEM_PROMPT
        if context.user_memory:
            system_prompt = (
                f"{CHAT_SYSTEM_PROMPT}\n\n"
                "Ngữ cảnh khách hàng từ các cuộc trò chuyện trước "
                "(dùng để cá nhân hóa tư vấn, không tự bịa đặt thêm thông tin ngoài ngữ cảnh):\n"
                f"{context.user_memory}"
            )

        try:
            ai_reply = await self.llm_client.generate(
                messages=messages,
                system_prompt=system_prompt,
            )
            if ai_reply:
                context.reply = ai_reply
                context.source = settings.llm_provider.lower()
                # Đồng bộ danh sách products trả về với những sản phẩm AI thực sự nhắc tới trong câu trả lời
                if context.retrieved_items:
                    reply_lower = ai_reply.casefold()
                    mentioned = [
                        item
                        for item in context.retrieved_items
                        if (item.product_name and item.product_name.casefold() in reply_lower)
                        or (item.product_id and item.product_id.casefold() in reply_lower)
                    ]
                    if mentioned:
                        context.retrieved_items = mentioned
                return context
        except Exception as exc:
            logger.error("ResponseWorker LLM error: %s", exc)

        context.reply = _format_fallback_reply(context)
        context.source = "qdrant-fallback"
        return context
