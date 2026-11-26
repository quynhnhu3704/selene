from app.clients.embedding_client import EmbeddingClient
from app.clients.qdrant_client import QdrantStoreClient
from app.schemas.context import PipelineContext, RetrievedItem
from app.workers.base import BaseWorker


class RetrievalWorker(BaseWorker):
    """Embeds the query and searches Qdrant for relevant products/documents."""

    def __init__(
        self,
        embedding_client: EmbeddingClient,
        qdrant_client: QdrantStoreClient,
    ) -> None:
        self.embedding_client = embedding_client
        self.qdrant_client = qdrant_client

    async def run(self, context: PipelineContext) -> PipelineContext:
        query_text = context.rewritten_query or context.original_message
        query_vector = await self.embedding_client.embed_text(query_text)

        hits = self.qdrant_client.search(
            query_vector=query_vector,
            limit=context.top_k,
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
