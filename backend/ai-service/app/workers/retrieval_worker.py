import asyncio
import json
import logging
from typing import Any

import httpx
from supabase import Client, create_client

from app.clients.embedding_client import EmbeddingClient
from app.clients.qdrant_client import QdrantStoreClient
from app.core.config import settings
from app.schemas.context import PipelineContext, RetrievedItem
from app.workers.base import BaseWorker

logger = logging.getLogger(__name__)


def _unwrap_first_image(val: Any) -> str | None:
    """Recursively extract the first valid URL string from list/dict/JSON-string."""
    if not val:
        return None
    if isinstance(val, list):
        for item in val:
            found = _unwrap_first_image(item)
            if found:
                return found
        return None
    if isinstance(val, dict):
        return _unwrap_first_image(val.get("url") or val.get("image_url") or val.get("src"))
    if isinstance(val, str):
        s = val.strip()
        if not s or s in ("[", "]", "null", "undefined"):
            return None
        if s.startswith("[") or s.startswith("{"):
            try:
                return _unwrap_first_image(json.loads(s))
            except json.JSONDecodeError:
                return None
        clean = s.strip("\"'").strip()
        return clean if len(clean) >= 5 else None
    return None


def _extract_first_image_url(payload: dict[str, Any]) -> str | None:
    """Return the first valid image URL from Qdrant payload variants."""
    for key in ("image_url", "image_urls", "images"):
        found = _unwrap_first_image(payload.get(key))
        if found:
            return found

    snapshot = payload.get("source_snapshot")
    if isinstance(snapshot, dict):
        return _unwrap_first_image(snapshot.get("image_urls"))
    return None


def _hit_dedup_key(hit: dict[str, Any]) -> str:
    payload = hit.get("payload") or {}
    return str(payload.get("product_id") or payload.get("id") or hit["id"])


def _matches_active_name(hit: dict[str, Any], active_names: list[str]) -> bool:
    if not active_names:
        return False
    payload = hit.get("payload") or {}
    product_name = str(
        payload.get("product_name") or payload.get("name") or payload.get("title") or ""
    ).casefold()
    product_id = str(payload.get("product_id") or payload.get("id") or "").casefold()
    if not product_name and not product_id:
        return False

    for target in active_names:
        needle = " ".join(target.split()).casefold()
        if not needle:
            continue
        if needle in product_name or needle == product_id:
            return True
        # Match by SKU/code token (e.g. Z04612) if full name differs slightly
        tokens = [tok for tok in needle.split() if len(tok) >= 4 and any(c.isdigit() for c in tok)]
        if any(tok in product_name or tok == product_id for tok in tokens):
            return True
    return False


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
        prod_url = settings.product_supabase_url.strip()
        prod_key = settings.product_supabase_key.strip()
        self._product_supabase: Client | None = (
            create_client(prod_url, prod_key) if prod_url and prod_key else None
        )

    def _fetch_product_media_sync(self, product_ids: list[str]) -> dict[str, dict[str, Any]]:
        if not self._product_supabase or not product_ids:
            return {}
        try:
            resp = (
                self._product_supabase.table("products")
                .select("product_id, image_urls, original_price, discount_price")
                .in_("product_id", product_ids)
                .execute()
            )
            return {
                str(row["product_id"]): row
                for row in (resp.data or [])
                if row.get("product_id") is not None
            }
        except Exception as exc:
            logger.warning("Failed to enrich product images from product Supabase: %s", exc)
            return {}

    async def _fetch_product_media_via_service(
        self, product_ids: list[str]
    ) -> dict[str, dict[str, Any]]:
        base_url = settings.product_service_url.rstrip("/")
        if not base_url or not product_ids:
            return {}

        async def fetch_one(client: httpx.AsyncClient, pid: str) -> tuple[str, dict[str, Any] | None]:
            try:
                resp = await client.get(f"{base_url}/product-detail/{pid}")
                if resp.status_code != 200:
                    return pid, None
                data = resp.json().get("data")
                return pid, data if isinstance(data, dict) else None
            except Exception as exc:
                logger.debug("Product service lookup failed for %s: %s", pid, exc)
                return pid, None

        async with httpx.AsyncClient(timeout=4.0) as client:
            pairs = await asyncio.gather(*(fetch_one(client, pid) for pid in product_ids))
        return {pid: data for pid, data in pairs if data}

    async def run(self, context: PipelineContext) -> PipelineContext:
        queries = context.rewritten_queries or (
            [context.rewritten_query] if context.rewritten_query else [context.original_message]
        )
        queries = [q for q in queries if q.strip()]
        if not queries:
            context.retrieved_items = []
            context.matched = False
            return context

        search_queries = list(queries)
        if context.conversation_intent == "followup" and context.active_product_names:
            existing_cf = {q.casefold() for q in search_queries}
            for name in context.active_product_names:
                if name.strip() and name.casefold() not in existing_cf:
                    search_queries.append(name.strip())
                    existing_cf.add(name.casefold())

        query_vectors = await self.embedding_client.embed_batch(
            search_queries, task="retrieval.query"
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

        rrf_hits = (
            _rrf_merge(ranked_lists, top_k=max(context.top_k, 5), rrf_k=settings.rrf_k)
            if len(ranked_lists) > 1
            else ranked_lists[0][: max(context.top_k, 5)]
        )

        pinned_hits: list[dict[str, Any]] = []
        pinned_keys: set[str] = set()
        if context.conversation_intent == "followup" and context.active_product_names:
            for ranked in ranked_lists:
                for hit in ranked:
                    key = _hit_dedup_key(hit)
                    if key not in pinned_keys and _matches_active_name(hit, context.active_product_names):
                        pinned_keys.add(key)
                        pinned_hits.append(dict(hit))

        if pinned_hits:
            context.active_product_ids = [
                str((h.get("payload") or {}).get("product_id") or (h.get("payload") or {}).get("id") or h["id"])
                for h in pinned_hits
            ]
            remaining_hits = [h for h in rrf_hits if _hit_dedup_key(h) not in pinned_keys]
            final_limit = max(context.top_k, len(pinned_hits) + 1)
            hits = (pinned_hits + remaining_hits)[:final_limit]
        else:
            context.active_product_ids = []
            hits = rrf_hits[: context.top_k]

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
                    image_url=_extract_first_image_url(payload),
                    description=payload.get("description"),
                    text=payload.get("text") or payload.get("content"),
                    payload=payload,
                )
            )

        context.retrieved_items = items
        missing_media_ids = [
            item.product_id
            for item in items
            if item.product_id and not item.image_url
        ]
        if missing_media_ids:
            media_map: dict[str, dict[str, Any]] = {}
            if self._product_supabase:
                media_map = await asyncio.to_thread(
                    self._fetch_product_media_sync, missing_media_ids
                )
            else:
                media_map = await self._fetch_product_media_via_service(missing_media_ids)

            for item in items:
                row = media_map.get(str(item.product_id))
                if not row:
                    continue
                if not item.image_url:
                    item.image_url = _unwrap_first_image(
                        row.get("image_url") or row.get("image_urls") or row.get("images")
                    )
                if item.original_price is None and row.get("original_price") is not None:
                    item.original_price = row.get("original_price")
                if item.discount_price is None and row.get("discount_price") is not None:
                    item.discount_price = row.get("discount_price")

        context.matched = any(item.score > 0.05 for item in items)
        return context
