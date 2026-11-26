import logging
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.core.config import settings

logger = logging.getLogger(__name__)


class QdrantStoreClient:
    """Wrapper around QdrantClient supporting both remote server and local disk storage."""

    def __init__(self) -> None:
        if settings.qdrant_url:
            self._client = QdrantClient(
                url=settings.qdrant_url,
                api_key=settings.qdrant_api_key or None,
            )
            self.mode = "remote"
        else:
            self._client = QdrantClient(path=settings.qdrant_path)
            self.mode = "local"
        self.collection_name = settings.qdrant_collection

    def ensure_collection(self, vector_size: int | None = None) -> None:
        size = vector_size or settings.embedding_dim
        collections = self._client.get_collections().collections
        existing_names = {c.name for c in collections}

        if self.collection_name not in existing_names:
            self._client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=size, distance=Distance.COSINE),
            )
            logger.info("Created Qdrant collection '%s' (dim=%s)", self.collection_name, size)

    def upsert_points(self, points: list[PointStruct]) -> None:
        if not points:
            return
        self._client.upsert(collection_name=self.collection_name, points=points)

    def search(
        self,
        query_vector: list[float],
        limit: int = 5,
        score_threshold: float | None = None,
    ) -> list[dict[str, Any]]:
        collections = {c.name for c in self._client.get_collections().collections}
        if self.collection_name not in collections:
            return []

        response = self._client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            limit=limit,
            score_threshold=score_threshold,
            with_payload=True,
        )

        return [
            {
                "id": str(point.id),
                "score": float(point.score),
                "payload": dict(point.payload or {}),
            }
            for point in response.points
        ]

    def count(self) -> int:
        collections = {c.name for c in self._client.get_collections().collections}
        if self.collection_name not in collections:
            return 0
        return int(self._client.count(collection_name=self.collection_name).count)

    def health_check(self) -> bool:
        try:
            self._client.get_collections()
            return True
        except Exception as exc:
            logger.warning("Qdrant health check failed: %s", exc)
            return False
