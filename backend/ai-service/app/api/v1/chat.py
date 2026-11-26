from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.api.deps import get_chat_pipeline, get_summary_worker
from app.schemas.chat import ChatRequest, ChatResponse, EndSessionRequest, EndSessionResponse
from app.services.chat_pipeline import ChatPipeline
from app.workers.summary_worker import SummaryWorker

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    pipeline: ChatPipeline = Depends(get_chat_pipeline),
) -> ChatResponse:
    try:
        data = await pipeline.execute(request)
        return ChatResponse(status=200, message="Gửi tin nhắn thành công!", data=data)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"AI service tạm thời gặp sự cố: {exc}",
        ) from exc


@router.post("/chat/end-session", response_model=EndSessionResponse)
async def end_session_endpoint(
    request: EndSessionRequest,
    background_tasks: BackgroundTasks,
    summary_worker: SummaryWorker = Depends(get_summary_worker),
) -> EndSessionResponse:
    messages_override = (
        [{"role": item.role, "text": item.text} for item in request.messages]
        if request.messages
        else None
    )
    background_tasks.add_task(
        summary_worker.summarize_conversation,
        conversation_id=request.session_id,
        account_id=request.user_id,
        messages_override=messages_override,
    )
    return EndSessionResponse(
        status=200,
        message="Đã đưa phiên chat vào hàng đợi tóm tắt.",
    )
