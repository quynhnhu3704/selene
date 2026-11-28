import json
import logging
import re

from app.clients.llm_client import LLMClient
from app.core.config import settings
from app.core.prompts import REWRITE_SYSTEM_PROMPT
from app.schemas.context import PipelineContext
from app.workers.base import BaseWorker

logger = logging.getLogger(__name__)


_VALID_INTENTS = {"followup", "alternative", "new_search"}
_SKU_PATTERN = re.compile(r"\b[A-Z]{1,3}\d{3,6}\b")
_BOLD_PRODUCT_PATTERN = re.compile(r"\*\*([^*]{4,80})\*\*")
_FOLLOWUP_HINT_PATTERN = re.compile(
    r"^(?:vậy|thế|còn|nếu|nhưng|mà|cho\s+hỏi|hỏi\s+thêm)?\s*(?:nếu\s+)?(?:\d+\s*kg|\d+\s*cm|size\b|màu\b|giá\b|mẫu\s*(?:này|đó)|cái\s*(?:này|đó)|nó\b)",
    re.IGNORECASE,
)


def _dedupe_preserve_order(items: list[str], limit: int) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()
    for item in items:
        normalized = " ".join(str(item).split())
        key = normalized.lower()
        if normalized and key not in seen:
            seen.add(key)
            deduped.append(normalized)
        if len(deduped) >= limit:
            break
    return deduped


def _extract_recent_products_from_history(history: list[dict[str, str]], limit: int = 2) -> list[str]:
    """Fallback extractor for product names/SKUs mentioned in recent assistant turns."""
    found: list[str] = []
    for item in reversed(history[-6:]):
        if item.get("role") not in ("assistant", "bot", "model"):
            continue
        text = item.get("text", "")
        for match in _BOLD_PRODUCT_PATTERN.findall(text):
            cleaned = " ".join(match.split())
            if len(cleaned) >= 4:
                found.append(cleaned)
        if not found:
            for sku in _SKU_PATTERN.findall(text):
                found.append(sku)
        if found:
            break
    return _dedupe_preserve_order(found, limit)


def _parse_rewrite_output(
    raw: str,
    fallback_query: str,
    max_queries: int,
) -> tuple[str, list[str], list[str]]:
    """Parse structured JSON {intent, active_products, queries} or legacy query list."""
    text = raw.strip()
    if not text:
        return "new_search", [], [fallback_query]

    cleaned_json = re.sub(
        r"^```(?:json)?\s*|\s*```$",
        "",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    ).strip()

    obj_match = re.search(r"\{.*\}", cleaned_json, flags=re.DOTALL)
    if obj_match:
        try:
            parsed = json.loads(obj_match.group(0))
            if isinstance(parsed, dict):
                raw_intent = str(parsed.get("intent") or "").strip().lower()
                intent = raw_intent if raw_intent in _VALID_INTENTS else "new_search"
                raw_active = parsed.get("active_products")
                active_products = (
                    _dedupe_preserve_order([str(x) for x in raw_active if str(x).strip()], 2)
                    if isinstance(raw_active, list)
                    else []
                )
                raw_queries = parsed.get("queries")
                queries = (
                    _dedupe_preserve_order([str(x) for x in raw_queries if str(x).strip()], max_queries)
                    if isinstance(raw_queries, list)
                    else []
                )
                return intent, active_products, queries or [fallback_query]
        except json.JSONDecodeError:
            pass

    candidates: list[str] = []
    arr_match = re.search(r"\[.*\]", cleaned_json, flags=re.DOTALL)
    if arr_match:
        try:
            parsed = json.loads(arr_match.group(0))
            if isinstance(parsed, list):
                candidates = [str(item).strip() for item in parsed if str(item).strip()]
        except json.JSONDecodeError:
            candidates = []

    if not candidates:
        for line in text.splitlines():
            item = re.sub(r"^\s*(?:\d+[\.\)]\s*|[-*•]\s*)", "", line).strip().strip('"\',')
            if item:
                candidates.append(item)

    queries = _dedupe_preserve_order(candidates, max_queries) or [fallback_query]
    return "new_search", [], queries


class RewriteWorker(BaseWorker):
    """Analyzes conversation context and rewrites the user question into Qdrant queries."""

    def __init__(self, llm_client: LLMClient) -> None:
        self.llm_client = llm_client

    async def run(self, context: PipelineContext) -> PipelineContext:
        cleaned = " ".join(context.original_message.split())
        if not cleaned:
            context.rewritten_query = ""
            context.rewritten_queries = []
            context.conversation_intent = "new_search"
            context.active_product_names = []
            return context

        fallback_active = (
            _extract_recent_products_from_history(context.history)
            if _FOLLOWUP_HINT_PATTERN.search(cleaned)
            else []
        )

        if not self.llm_client.is_configured():
            context.conversation_intent = "followup" if fallback_active else "new_search"
            context.active_product_names = fallback_active
            context.rewritten_queries = _dedupe_preserve_order(
                [*fallback_active, cleaned], max(1, settings.rewrite_query_count)
            )
            context.rewritten_query = context.rewritten_queries[0]
            return context

        query_count = max(1, min(settings.rewrite_query_count, 5))
        history_lines = "\n".join(
            f"{item['role']}: {item['text'][:500]}" for item in context.history[-6:]
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
                temperature=0.1,
                max_tokens=320,
            )
            intent, active_products, queries = _parse_rewrite_output(
                rewritten or "", cleaned, query_count
            )
        except Exception as exc:
            logger.warning("RewriteWorker fallback to original query: %s", exc)
            intent = "followup" if fallback_active else "new_search"
            active_products = fallback_active
            queries = [cleaned]

        if not active_products and fallback_active:
            active_products = fallback_active
            if intent == "new_search":
                intent = "followup"

        if intent == "followup" and active_products:
            primary_product = active_products[0]
            if not any(primary_product.casefold() in q.casefold() for q in queries):
                queries = _dedupe_preserve_order([primary_product, *queries], query_count)

        context.conversation_intent = intent
        context.active_product_names = active_products
        context.rewritten_queries = queries
        context.rewritten_query = queries[0]
        return context
