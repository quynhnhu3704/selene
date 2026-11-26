"""Reliable Supabase -> Qdrant product sync worker (run separately from FastAPI).

Reads the transactional outbox created by migrations/001_ai_product_sync_outbox.sql.
Uses the *same* Colab UUID5 mapping and the existing Jina 1024-dim collection.
"""
import argparse
import asyncio
import hashlib
import json
import logging
import os
import re
import sys
import uuid
from pathlib import Path

import httpx
from dotenv import load_dotenv
from qdrant_client import QdrantClient, models
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env", override=False)
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.clients.embedding_client import EmbeddingClient
from app.core.config import settings

log = logging.getLogger("selene.product_sync")
COLLECTION = "selene_products_jina_v3"


def point_id(product_id: str) -> str:
    # Must match the exact deterministic ID in selene_qdrant_sync.ipynb.
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"selene:product:{product_id}"))


def _str(value) -> str:
    return str(value or "").strip()


def _image_urls(value) -> list[str]:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (ValueError, TypeError):
            value = [value]
    return [str(u) for u in value] if isinstance(value, list) else []


def _product_type(name: str) -> str:
    n = name.upper()
    rules = [
        (r"SET\s*BỘ|SET\s+ĐỒ", "set_bo"),
        (r"ÁO\s+KHOÁC|ÁO\s+VEST|ÁO\s+MĂNG", "ao_khoac"),
        (r"CHÂN\s+VÁY", "chan_vay"),
        (r"QUẦN\s+SHORT|QUẦN\s+SOOC", "quan_short"),
        (r"QUẦN\s+ÁO\s+DÀI", "quan_ao_dai"),
        (r"QUẦN", "quan_dai"),
        (r"ĐẦM|VÁY", "dam"),
        (r"ÁO", "ao"),
    ]
    return next((kind for pattern, kind in rules if re.search(pattern, n)), "khac")


def _materials(description: str) -> list[str]:
    # Keep labels compatible with the Colab payload (not a full NLP parser).
    d = description.casefold()
    labels = [
        (r"\bvoan\b", "voan"), (r"\blụa\b", "lua"),
        (r"\bdenim\b|\bjean", "denim"),
        (r"\bvải\s+dạ\b|\bdạ\s+len\b", "da_vai"),
        (r"\bda\s+thật\b|\bda\s+pu\b", "da"),
        (r"\btweed\b", "tweed"), (r"\bren\b", "ren"),
        (r"\bthô\b", "tho"), (r"\btơ\b", "to"),
    ]
    return [label for pattern, label in labels if re.search(pattern, d)]


def _sha(payload: dict) -> str:
    blob = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def prepare(row: dict) -> tuple[str, dict] | None:
    """Return latest retrieval document + full metadata, or None if not sellable."""
    category = row.get("categories") or {}
    brand = row.get("brands") or {}
    if isinstance(category, list):
        category = category[0] if category else {}
    if isinstance(brand, list):
        brand = brand[0] if brand else {}
    if row.get("status") != "active" or category.get("status") != "active":
        return None

    variants = row.get("product_variants") or []
    sellable = [
        v for v in variants
        if v.get("status") == "active" and (float(v.get("stock_quantity") or 0) > 0)
    ]
    if not sellable:
        return None

    sizes = sorted({_str(v.get("size")) for v in sellable if v.get("size")})
    colors = sorted({_str(v.get("color")) for v in sellable if v.get("color")})
    name = _str(row.get("product_name"))
    category_name = _str(category.get("name"))
    brand_name = _str(brand.get("name"))
    description = _str(row.get("description"))
    document = "\n".join([
        f"Tên sản phẩm: {name}",
        f"Danh mục: {category_name}",
        f"Thương hiệu: {brand_name}",
        f"Mô tả: {description}",
        f"Kích thước còn hàng: {', '.join(sizes)}",
        f"Màu sắc còn hàng: {', '.join(colors)}",
    ])
    price = row.get("discount_price")
    if price is None:
        price = row.get("original_price")
    images = _image_urls(row.get("image_urls"))
    total_stock = sum(float(v.get("stock_quantity") or 0) for v in sellable)
    # Preserve both original Colab metadata and current ai-service retrieval names.
    payload = {
        "product_id": str(row["product_id"]),
        "product_name": name,
        "category": category_name,
        "category_name": category_name,
        "brand": brand_name,
        "price": float(price) if price is not None else None,
        "original_price": row.get("original_price"),
        "discount_price": row.get("discount_price"),
        "description": description,
        "image_url": images[0] if images else "",
        "image_urls": images,
        "status": row.get("status"),
        "sizes": sizes,
        "colors": colors,
        "total_stock": total_stock,
        "in_stock": total_stock > 0,
        "product_type": _product_type(name),
        "materials": _materials(description),
        "document": document,
        "text": document,
        # Store source data so EVERY changed field, including images and variant
        # attributes not used in embeddings, is detectable by metadata comparison.
        "source_snapshot": {
            "product": {k: v for k, v in row.items()
                        if k not in ("categories", "brands", "product_variants")},
            "category": category,
            "brand": brand,
            "variants": sorted(variants, key=lambda v: str(v.get("variant_id", ""))),
        },
    }
    return document, payload


class ProductSyncWorker:
    def __init__(self):
        service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if not service_key:
            raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY (server-side only)")
        if not settings.supabase_url:
            raise RuntimeError("Missing SUPABASE_URL")
        if not settings.qdrant_url or not settings.qdrant_api_key:
            raise RuntimeError("QDRANT_URL and QDRANT_API_KEY are required")
        if settings.qdrant_collection != COLLECTION:
            raise RuntimeError(f"Set QDRANT_COLLECTION={COLLECTION} before running")
        if (settings.embedding_provider.lower() != "jina"
                or settings.embedding_model != "jina-embeddings-v3"
                or settings.embedding_dim != 1024
                or not settings.jina_api_key):
            raise RuntimeError("Requires Jina v3, 1024 dimensions, and JINA_API_KEY")

        self.supabase = create_client(settings.supabase_url, service_key)
        self.qdrant = QdrantClient(
            url=settings.qdrant_url, api_key=settings.qdrant_api_key,
            timeout=60,
        )
        if not self.qdrant.collection_exists(COLLECTION):
            raise RuntimeError(f"Collection {COLLECTION} missing; refusing to auto-create")
        config = self.qdrant.get_collection(COLLECTION).config.params.vectors
        if (not isinstance(config, models.VectorParams)
                or config.size != 1024
                or config.distance != models.Distance.COSINE):
            raise RuntimeError("Existing Qdrant collection is not a single 1024D vector")
        self.embedder = EmbeddingClient()

    def fetch_product(self, product_id: str) -> dict | None:
        response = (self.supabase.table("products")
                    .select("*, categories(*), brands(*), product_variants(*)")
                    .eq("product_id", product_id).maybe_single().execute())
        return response.data if response is not None else None

    async def sync_product(self, product_id: str) -> str:
        row = self.fetch_product(product_id)
        pid = point_id(product_id)
        current = self.qdrant.retrieve(
            collection_name=COLLECTION, ids=[pid], with_payload=True, with_vectors=False,
        )
        prepared = prepare(row) if row else None
        if prepared is None:
            if current:
                self.qdrant.delete(
                    collection_name=COLLECTION,
                    points_selector=models.PointIdsList(points=[pid]), wait=True,
                )
                return "DELETE"
            return "ABSENT"

        document, payload = prepared
        if not current or (current[0].payload or {}).get("document") != document:
            vector = await self.embedder.embed_text(document, task="retrieval.passage")
            if len(vector) != 1024:
                raise RuntimeError(f"Embedding dimension mismatch: {len(vector)}")
            self.qdrant.upsert(
                collection_name=COLLECTION,
                points=[models.PointStruct(id=pid, vector=vector, payload=payload)],
                wait=True,
            )
            return "NEW" if not current else "REEMBED"

        old_payload = current[0].payload or {}
        if _sha(old_payload) != _sha(payload):
            # Unlike set_payload, overwrite_payload removes stale keys.
            self.qdrant.overwrite_payload(
                collection_name=COLLECTION, payload=payload, points=[pid], wait=True,
            )
            return "METADATA_ONLY"
        return "UNCHANGED"

    def claim(self, batch_size: int):
        response = self.supabase.rpc("claim_ai_product_sync_jobs", {"p_limit": batch_size}).execute()
        return response.data or []

    def finish(self, product_id: str, revision: int, success: bool):
        self.supabase.rpc("finish_ai_product_sync_job", {
            "p_product_id": product_id,
            "p_revision": revision,
            "p_success": success,
        }).execute()

    async def run_once(self, batch_size: int) -> int:
        jobs = self.claim(batch_size)
        for job in jobs:
            product_id, revision = job["product_id"], int(job["revision"])
            success = False
            try:
                result = await self.sync_product(product_id)
                log.info("product_id=%s revision=%s result=%s", product_id, revision, result)
                success = True
            except Exception:
                log.exception("Sync failed: product_id=%s revision=%s", product_id, revision)
            finally:
                try:
                    self.finish(product_id, revision, success)
                except Exception:
                    log.exception("Could not ACK product_id=%s; will retry after lease", product_id)
        return len(jobs)


async def run_worker(worker, batch_size: int, interval: float, *, once: bool = False):
    """Keep polling through transport outages; let configuration/code errors surface."""
    retry_delay = min(interval, 60.0)
    while True:
        try:
            count = await worker.run_once(batch_size)
        except httpx.TransportError:
            if once:
                raise
            # A lost claim response may already have reserved jobs on the server.
            # Leave those leases intact; the queue makes them eligible on expiry.
            log.exception("Worker connection failed; retrying in %.1fs", retry_delay)
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 60.0)
            continue
        retry_delay = min(interval, 60.0)
        if once:
            return
        if count == 0:
            await asyncio.sleep(interval)


async def main():
    parser = argparse.ArgumentParser(description="SELENE reliable product sync worker")
    parser.add_argument("--once", action="store_true", help="Process one batch, then exit")
    parser.add_argument("--batch-size", type=int, default=10)
    parser.add_argument("--interval", type=float, default=5.0)
    parser.add_argument("--dry-run", action="store_true", help="Read pending queue rows; no claims or writes")
    args = parser.parse_args()
    if not 1 <= args.batch_size <= 100 or args.interval <= 0:
        parser.error("batch-size must be 1..100 and interval must be positive")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    worker = ProductSyncWorker()
    if args.dry_run:
        rows = (worker.supabase.table("ai_product_sync_queue")
                .select("product_id,revision,processed_revision,next_attempt_at,lease_until")
                .order("updated_at", desc=True).limit(args.batch_size).execute()).data or []
        for row in rows:
            print(json.dumps(row, ensure_ascii=False))
        print("DRY RUN: read-only, no queue claims or Qdrant mutations")
        return
    await run_worker(worker, args.batch_size, args.interval, once=args.once)


if __name__ == "__main__":
    asyncio.run(main())
