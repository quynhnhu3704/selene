import argparse
import asyncio
import json
import sys
import uuid
from pathlib import Path

from qdrant_client.models import PointStruct

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.clients.embedding_client import EmbeddingClient
from app.clients.qdrant_client import QdrantStoreClient
from scripts.sync_supabase import _build_product_payload, sync


async def seed_from_json(json_path: Path) -> None:
    if not json_path.exists():
        raise FileNotFoundError(f"File not found: {json_path}")

    with json_path.open("r", encoding="utf-8") as f:
        rows = json.load(f)

    if not isinstance(rows, list) or not rows:
        print("JSON file contains no product records.")
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
    print(f"Seeded {len(points)} products from '{json_path}' into '{qdrant.collection_name}'.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed Qdrant from Supabase or a real product JSON file."
    )
    parser.add_argument(
        "--file",
        type=Path,
        default=None,
        help="Optional path to a JSON file containing real product records. Omit to sync from Supabase.",
    )
    args = parser.parse_args()

    if args.file is not None:
        asyncio.run(seed_from_json(args.file))
    else:
        asyncio.run(sync())


if __name__ == "__main__":
    main()
