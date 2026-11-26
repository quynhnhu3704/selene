import json
import logging
import re

from app.clients.llm_client import LLMClient
from app.core.config import settings
from app.core.prompts import REWRITE_SYSTEM_PROMPT
from app.schemas.context import PipelineContext
from app.workers.base import BaseWorker

logger = logging.getLogger(__name__)


def _parse_rewritten_queries(raw: str, fallback: str, max_queries: int) -> list[str]:
    """Parse JSON array or line-separated queries from LLM output, preserving order."""
    text = raw.strip()
    if not text:
        return [fallback]

    candidates: list[str] = []

    # Strip optional markdown code fences before trying JSON parse
    cleaned_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE | re.DOTALL).strip()
    match = re.search(r"\[.*\]", cleaned_json, flags=re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, list):
                candidates = [str(item).strip() for item in parsed if str(item).strip()]
        except json.JSONDecodeError:
            candidates = []

    if not candidates:
        for line in text.splitlines():
            item = re.sub(r"^\s*(?:\d+[\.\)]\s*|[-*•]\s*)", "", line).strip().strip('"\',')
            if item:
                candidates.append(item)

    deduped: list[str] = []
    seen: set[str] = set()
    for item in candidates:
        normalized = " ".join(item.split())
        key = normalized.lower()
        if normalized and key not in seen:
            seen.add(key)
            deduped.append(normalized)
        if len(deduped) >= max_queries:
            break

    return deduped or [fallback]


class RewriteWorker(BaseWorker):
    """Rewrites and expands the user question into multiple clean search queries for Qdrant."""

    def __init__(self, llm_client: LLMClient) -> None:
        self.llm_client = llm_client

    async def run(self, context: PipelineContext) -> PipelineContext:
        cleaned = " ".join(context.original_message.split())
        if not cleaned:
            context.rewritten_query = ""
            context.rewritten_queries = []
            return context

        if not self.llm_client.is_configured():
            context.rewritten_query = cleaned
            context.rewritten_queries = [cleaned]
            return context

        query_count = max(1, min(settings.rewrite_query_count, 5))
        history_lines = "\n".join(
            f"{item['role']}: {item['text'][:180]}" for item in context.history[-4:]
        )
        prompt_parts = []
        if history_lines:
            prompt_parts.append(f"Lịch sử hội thoại gần đây:\n{history_lines}")
        prompt_parts.append(f"Câu hỏi hiện tại: {cleaned}")
        prompt = "\n\n".join(prompt_parts)

        system_prompt = REWRITE_SYSTEM_PROMPT.format(query_count=query_count)

        try:
            rewritten = await self.llm_client.generate(
                messages=[{"role": "user", "content": prompt}],
                system_prompt=system_prompt,
                temperature=0.2,
                max_tokens=256,
            )
            queries = _parse_rewritten_queries(rewritten or "", cleaned, query_count)
        except Exception as exc:
            logger.warning("RewriteWorker fallback to original query: %s", exc)
            queries = [cleaned]

        context.rewritten_queries = queries
        context.rewritten_query = queries[0]
        return context
