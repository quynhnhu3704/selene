from typing import Any

from pydantic import BaseModel, Field


class RetrievedItem(BaseModel):
    """A single document/product retrieved from Qdrant."""

    id: str
    score: float
    product_id: str | None = None
    product_name: str | None = None
    category_name: str | None = None
    original_price: float | None = None
    discount_price: float | None = None
    image_url: str | None = None
    description: str | None = None
    text: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class PipelineContext(BaseModel):
    """Shared state passed across pipeline workers."""

    original_message: str
    rewritten_query: str = ""
    rewritten_queries: list[str] = Field(default_factory=list)
    history: list[dict[str, str]] = Field(default_factory=list)
    top_k: int = 3
    user_id: str | None = None
    session_id: str | None = None
    user_memory: str = ""
    context_injected: bool = False
    retrieved_items: list[RetrievedItem] = Field(default_factory=list)
    matched: bool = False
    reply: str = ""
    source: str = "qdrant"
