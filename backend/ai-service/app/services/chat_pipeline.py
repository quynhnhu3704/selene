from app.clients.memory_client import MemoryClient
from app.schemas.chat import ChatRequest, ChatResponseData
from app.schemas.context import PipelineContext
from app.workers.response_worker import ResponseWorker
from app.workers.retrieval_worker import RetrievalWorker
from app.workers.rewrite_worker import RewriteWorker


class ChatPipeline:
    """Coordinates query rewrite, Qdrant retrieval, user memory injection, and LLM response generation."""

    def __init__(
        self,
        rewrite_worker: RewriteWorker,
        retrieval_worker: RetrievalWorker,
        response_worker: ResponseWorker,
        memory_client: MemoryClient | None = None,
    ) -> None:
        self.rewrite_worker = rewrite_worker
        self.retrieval_worker = retrieval_worker
        self.response_worker = response_worker
        self.memory_client = memory_client

    async def execute(self, request: ChatRequest) -> ChatResponseData:
        context = PipelineContext(
            original_message=request.message.strip(),
            history=[
                {"role": item.role, "text": item.text.strip()}
                for item in request.history
            ],
            top_k=request.top_k,
            user_id=request.user_id,
            session_id=request.session_id,
        )

        should_mark_injected = False
        if (
            self.memory_client
            and self.memory_client.is_configured()
            and request.user_id
            and request.session_id
        ):
            state = await self.memory_client.get_or_create_conversation_state(
                conversation_id=request.session_id,
                account_id=request.user_id,
            )
            if state is not None and not state.get("context_injected", False):
                should_mark_injected = True
                summary = await self.memory_client.get_user_memory(request.user_id)
                if summary:
                    context.user_memory = summary
                    context.context_injected = True

        context = await self.rewrite_worker.run(context)
        context = await self.retrieval_worker.run(context)
        context = await self.response_worker.run(context)

        if (
            self.memory_client
            and self.memory_client.is_configured()
            and request.user_id
            and request.session_id
        ):
            if should_mark_injected:
                await self.memory_client.mark_context_injected_and_touch(
                    conversation_id=request.session_id,
                    account_id=request.user_id,
                )
            else:
                await self.memory_client.touch_conversation(
                    conversation_id=request.session_id,
                    account_id=request.user_id,
                )

        return ChatResponseData(
            reply=context.reply,
            rewritten_query=context.rewritten_query,
            rewritten_queries=context.rewritten_queries,
            products=context.retrieved_items,
            source=context.source,
            context_injected=context.context_injected,
        )
