from fastapi import APIRouter, Depends

from app.api.deps import get_embedding_client, get_llm_client, get_qdrant_client
from app.clients.embedding_client import EmbeddingClient
from app.clients.llm_client import LLMClient
from app.clients.qdrant_client import QdrantStoreClient
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(
    qdrant_client: QdrantStoreClient = Depends(get_qdrant_client),
    embedding_client: EmbeddingClient = Depends(get_embedding_client),
    llm_client: LLMClient = Depends(get_llm_client),
) -> dict:
    qdrant_ok = qdrant_client.health_check()
    return {
        "status": "UP",
        "service": settings.app_name,
        "version": settings.app_version,
        "port": settings.port,
        "qdrant": {
            "ok": qdrant_ok,
            "mode": qdrant_client.mode,
            "collection": qdrant_client.collection_name,
            "points": qdrant_client.count() if qdrant_ok else 0,
        },
        "llm": {
            "provider": llm_client.provider,
            "model": llm_client.model,
            "configured": llm_client.is_configured(),
        },
        "embedding": {
            "provider": embedding_client.provider,
            "model": embedding_client.model,
            "dim": embedding_client.dim,
        },
    }
