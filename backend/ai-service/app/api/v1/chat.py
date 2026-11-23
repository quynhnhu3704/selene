from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_chat_pipeline
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_pipeline import ChatPipeline

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
