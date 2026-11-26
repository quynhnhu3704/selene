import asyncio
import sys
import uuid
from pathlib import Path

from qdrant_client.models import PointStruct
from supabase import create_client

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.clients.embedding_client import EmbeddingClient
from app.clients.qdrant_client import QdrantStoreClient
from app.core.config import settings


def _build_product_payload(row: dict) -> dict:
    category = row.get("categories") or {}
    image_urls = row.get("image_urls") or []
    image_url = image_urls[0] if isinstance(image_urls, list) and image_urls else ""

    category_name = category.get("name", "") if isinstance(category, dict) else ""
    product_name = row.get("product_name", "")
    description = row.get("description", "") or ""
    discount_price = row.get("discount_price")
    original_price = row.get("original_price")

    text = (
        f"Sản phẩm: {product_name}. "
        f"Danh mục: {category_name}. "
        f"Giá: {discount_price or original_price or ''} VND. "
        f"Mô tả: {description}"
    ).strip()

    return {
        "product_id": str(row.get("product_id", "")),
        "product_name": product_name,
        "category_name": category_name,
        "original_price": original_price,
        "discount_price": discount_price,
        "image_url": image_url,
        "description": description,
        "text": text,
    }


async def sync() -> None:
    if not settings.supabase_url or not settings.supabase_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY in .env")

    sb = create_client(settings.supabase_url, settings.supabase_key)
    response = (
        sb.table("products")
        .select(
            "product_id, product_name, description, image_urls, original_price, discount_price, categories!inner(name, status)"
        )
        .eq("status", "active")
        .eq("categories.status", "active")
        .execute()
    )

    rows = response.data or []
    if not rows:
        print("No active products found in Supabase.")
        return

    payloads = [_build_product_payload(row) for row in rows]
    embedder = EmbeddingClient()
    vectors = await embedder.embed_batch([p["text"] for p in payloads])

    qdrant = QdrantStoreClient()
    qdrant.ensure_collection(vector_size=len(vectors[0]))

    points = [
        PointStruct(
            id=str(uuid.uuid5(uuid.NAMESPACE_DNS, payload["product_id"])),
            vector=vector,
            payload=payload,
        )
        for payload, vector in zip(payloads, vectors)
    ]

    qdrant.upsert_points(points)
    print(f"Synced {len(points)} active products from Supabase into Qdrant collection '{qdrant.collection_name}'.")


if __name__ == "__main__":
    asyncio.run(sync())
