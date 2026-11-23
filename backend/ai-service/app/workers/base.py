from abc import ABC, abstractmethod

from app.schemas.context import PipelineContext


class BaseWorker(ABC):
    """Base contract for all chat pipeline workers."""

    @abstractmethod
    async def run(self, context: PipelineContext) -> PipelineContext:
        raise NotImplementedError
