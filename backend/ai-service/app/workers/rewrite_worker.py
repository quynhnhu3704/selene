import logging

from app.clients.llm_client import LLMClient
from app.core.prompts import REWRITE_SYSTEM_PROMPT
from app.schemas.context import PipelineContext
from app.workers.base import BaseWorker

logger = logging.getLogger(__name__)


class RewriteWorker(BaseWorker):
    """Rewrites the user question into a clean search query for Qdrant."""

    def __init__(self, llm_client: LLMClient) -> None:
        self.llm_client = llm_client

    async def run(self, context: PipelineContext) -> PipelineContext:
        cleaned = " ".join(context.original_message.split())
        if not self.llm_client.is_configured() or not context.history:
            context.rewritten_query = cleaned
            return context

        history_lines = "\n".join(
            f"{item['role']}: {item['text']}" for item in context.history[-4:]
        )
        prompt = (
            f"Lịch sử hội thoại gần đây:\n{history_lines}\n\n"
            f"Câu hỏi hiện tại: {cleaned}"
        )
        try:
            rewritten = await self.llm_client.generate(
                messages=[{"role": "user", "content": prompt}],
                system_prompt=REWRITE_SYSTEM_PROMPT,
                temperature=0.1,
                max_tokens=128,
            )
            context.rewritten_query = rewritten.strip() if rewritten else cleaned
        except Exception as exc:
            logger.warning("RewriteWorker fallback to original query: %s", exc)
            context.rewritten_query = cleaned

        return context
