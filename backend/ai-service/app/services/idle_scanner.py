import asyncio
import logging

from app.clients.memory_client import MemoryClient
from app.core.config import settings
from app.workers.summary_worker import SummaryWorker

logger = logging.getLogger(__name__)


class IdleSessionScanner:
    """Periodically scans for idle active conversations and summarizes them."""

    def __init__(
        self,
        memory_client: MemoryClient,
        summary_worker: SummaryWorker,
    ) -> None:
        self.memory_client = memory_client
        self.summary_worker = summary_worker
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        if not settings.idle_scanner_enabled or not self.memory_client.is_configured():
            logger.info("IdleSessionScanner disabled or Supabase not configured.")
            return
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run_loop(), name="idle-session-scanner")
            logger.info(
                "IdleSessionScanner started (idle=%dm, interval=%ds)",
                settings.session_idle_timeout_minutes,
                settings.idle_scan_interval_seconds,
            )

    async def stop(self) -> None:
        if self._task is not None and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            logger.info("IdleSessionScanner stopped.")

    async def _run_loop(self) -> None:
        while True:
            try:
                await asyncio.sleep(settings.idle_scan_interval_seconds)
                idle_rows = await self.memory_client.find_idle_conversations(
                    idle_minutes=settings.session_idle_timeout_minutes
                )
                for row in idle_rows:
                    conv_id = str(row.get("conversation_id") or "")
                    account_id = str(row.get("account_id") or "")
                    if conv_id:
                        await self.summary_worker.summarize_conversation(
                            conversation_id=conv_id,
                            account_id=account_id or None,
                        )
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("IdleSessionScanner iteration error: %s", exc)
