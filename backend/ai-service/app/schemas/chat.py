from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.context import RetrievedItem


class ChatHistoryItem(BaseModel):
    role: Literal["user", "bot", "assistant"]
    text: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: list[ChatHistoryItem] = Field(default_factory=list, max_length=10)
    top_k: int = Field(default=5, ge=1, le=20)


class ChatResponseData(BaseModel):
    reply: str
    rewritten_query: str
    rewritten_queries: list[str] = Field(default_factory=list)
    products: list[RetrievedItem] = Field(default_factory=list)
    source: str


class ChatResponse(BaseModel):
    status: int = 200
    message: str = "Gửi tin nhắn thành công!"
    data: ChatResponseData
