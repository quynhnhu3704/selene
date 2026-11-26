from app.schemas.chat import ChatRequest, ChatResponseData
from app.schemas.context import PipelineContext
from app.workers.response_worker import ResponseWorker
from app.workers.retrieval_worker import RetrievalWorker
from app.workers.rewrite_worker import RewriteWorker


class ChatPipeline:
    """Coordinates query rewrite, Qdrant retrieval, and LLM response generation."""

    def __init__(
        self,
        rewrite_worker: RewriteWorker,
        retrieval_worker: RetrievalWorker,
        response_worker: ResponseWorker,
    ) -> None:
        self.rewrite_worker = rewrite_worker
        self.retrieval_worker = retrieval_worker
        self.response_worker = response_worker

    async def execute(self, request: ChatRequest) -> ChatResponseData:
        context = PipelineContext(
            original_message=request.message.strip(),
            history=[
                {"role": item.role, "text": item.text.strip()}
                for item in request.history
            ],
            top_k=request.top_k,
        )

        context = await self.rewrite_worker.run(context)
        context = await self.retrieval_worker.run(context)
        context = await self.response_worker.run(context)

        return ChatResponseData(
            reply=context.reply,
            rewritten_query=context.rewritten_query,
            rewritten_queries=context.rewritten_queries,
            products=context.retrieved_items,
            source=context.source,
        )
