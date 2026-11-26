import asyncio
from typing import Any

from app.clients.embedding_client import EmbeddingClient
from app.clients.qdrant_client import QdrantStoreClient
from app.core.config import settings
from app.schemas.context import PipelineContext, RetrievedItem
from app.workers.base import BaseWorker


def _rrf_merge(
    ranked_lists: list[list[dict[str, Any]]],
    top_k: int,
    rrf_k: int = 60,
) -> list[dict[str, Any]]:
    """Merge multiple Qdrant ranked result lists using Reciprocal Rank Fusion."""
    merged: dict[str, dict[str, Any]] = {}

    for hits in ranked_lists:
        for rank, hit in enumerate(hits, start=1):
            payload = hit.get("payload") or {}
            dedup_key = str(payload.get("product_id") or payload.get("id") or hit["id"])
            rrf_delta = 1.0 / (rrf_k + rank)
            raw_score = float(hit.get("score", 0.0))

            if dedup_key not in merged:
                merged[dedup_key] = {
                    "hit": hit,
                    "rrf_score": rrf_delta,
                    "max_score": raw_score,
                }
            else:
                merged[dedup_key]["rrf_score"] += rrf_delta
                if raw_score > merged[dedup_key]["max_score"]:
                    merged[dedup_key]["max_score"] = raw_score
                    merged[dedup_key]["hit"] = hit

    sorted_entries = sorted(
        merged.values(),
        key=lambda entry: (entry["rrf_score"], entry["max_score"]),
        reverse=True,
    )

    results: list[dict[str, Any]] = []
    for entry in sorted_entries[:top_k]:
        hit = dict(entry["hit"])
        hit["score"] = entry["max_score"]
        results.append(hit)
    return results


class RetrievalWorker(BaseWorker):
    """Embeds expanded queries in parallel, searches Qdrant, and merges via RRF."""

    def __init__(
        self,
        embedding_client: EmbeddingClient,
        qdrant_client: QdrantStoreClient,
    ) -> None:
        self.embedding_client = embedding_client
        self.qdrant_client = qdrant_client

    async def run(self, context: PipelineContext) -> PipelineContext:
        queries = context.rewritten_queries or (
            [context.rewritten_query] if context.rewritten_query else [context.original_message]
        )
        queries = [q for q in queries if q.strip()]
        if not queries:
            context.retrieved_items = []
            context.matched = False
            return context

        query_vectors = await self.embedding_client.embed_batch(
            queries, task="retrieval.query"
        )

        per_query_limit = max(context.top_k, 5)
        ranked_lists = await asyncio.gather(
            *(
                asyncio.to_thread(
                    self.qdrant_client.search,
                    query_vector=vec,
                    limit=per_query_limit,
                )
                for vec in query_vectors
            )
        )

        hits = (
            _rrf_merge(ranked_lists, top_k=context.top_k, rrf_k=settings.rrf_k)
            if len(ranked_lists) > 1
            else ranked_lists[0][: context.top_k]
        )

        items: list[RetrievedItem] = []
        for hit in hits:
            payload = hit["payload"]
            items.append(
                RetrievedItem(
                    id=hit["id"],
                    score=round(hit["score"], 4),
                    product_id=payload.get("product_id") or payload.get("id"),
                    product_name=payload.get("product_name") or payload.get("name") or payload.get("title"),
                    category_name=payload.get("category_name") or payload.get("category"),
                    original_price=payload.get("original_price"),
                    discount_price=payload.get("discount_price") or payload.get("price"),
                    image_url=payload.get("image_url"),
                    description=payload.get("description"),
                    text=payload.get("text") or payload.get("content"),
                    payload=payload,
                )
            )

        context.retrieved_items = items
        context.matched = any(item.score > 0.05 for item in items)
        return context
