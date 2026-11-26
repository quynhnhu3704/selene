from functools import lru_cache

from app.clients.embedding_client import EmbeddingClient
from app.clients.llm_client import LLMClient
from app.clients.qdrant_client import QdrantStoreClient
from app.core.config import settings
from app.services.chat_pipeline import ChatPipeline
from app.workers.response_worker import ResponseWorker
from app.workers.retrieval_worker import RetrievalWorker
from app.workers.rewrite_worker import RewriteWorker


@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantStoreClient:
    return QdrantStoreClient()


@lru_cache(maxsize=1)
def get_embedding_client() -> EmbeddingClient:
    return EmbeddingClient()


@lru_cache(maxsize=1)
def get_llm_client() -> LLMClient:
    return LLMClient()


@lru_cache(maxsize=1)
def get_rewrite_llm_client() -> LLMClient:
    return LLMClient(
        provider=settings.rewrite_llm_provider or settings.llm_provider,
        model=settings.rewrite_llm_model or settings.llm_model,
    )


@lru_cache(maxsize=1)
def get_chat_pipeline() -> ChatPipeline:
    qdrant_client = get_qdrant_client()
    embedding_client = get_embedding_client()
    llm_client = get_llm_client()
    rewrite_llm_client = get_rewrite_llm_client()

    return ChatPipeline(
        rewrite_worker=RewriteWorker(llm_client=rewrite_llm_client),
        retrieval_worker=RetrievalWorker(
            embedding_client=embedding_client,
            qdrant_client=qdrant_client,
        ),
        response_worker=ResponseWorker(llm_client=llm_client),
    )
