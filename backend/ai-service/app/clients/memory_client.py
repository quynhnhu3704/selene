import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from supabase import Client, create_client

from app.core.config import settings

logger = logging.getLogger(__name__)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class MemoryClient:
    """Reads and updates per-user memory summaries and per-conversation AI state in Supabase."""

    def __init__(self) -> None:
        self._client: Client | None = None
        if settings.supabase_url.strip() and settings.supabase_key.strip():
            self._client = create_client(settings.supabase_url, settings.supabase_key)

    def is_configured(self) -> bool:
        return self._client is not None

    async def get_user_memory(self, account_id: str) -> str:
        if not self._client or not account_id:
            return ""
        return await asyncio.to_thread(self._get_user_memory_sync, account_id)

    def _get_user_memory_sync(self, account_id: str) -> str:
        try:
            resp = (
                self._client.table("ai_user_memories")
                .select("summary_text")
                .eq("account_id", account_id)
                .limit(1)
                .execute()
            )
            rows = resp.data or []
            if rows:
                return str(rows[0].get("summary_text") or "").strip()
        except Exception as exc:
            logger.warning("Failed to fetch ai_user_memories for %s: %s", account_id, exc)
        return ""

    async def upsert_user_memory(
        self,
        account_id: str,
        summary_text: str,
        last_summarized_conversation_id: str | None = None,
    ) -> None:
        if not self._client or not account_id:
            return
        await asyncio.to_thread(
            self._upsert_user_memory_sync,
            account_id,
            summary_text,
            last_summarized_conversation_id,
        )

    def _upsert_user_memory_sync(
        self,
        account_id: str,
        summary_text: str,
        last_summarized_conversation_id: str | None,
    ) -> None:
        payload: dict[str, Any] = {
            "account_id": account_id,
            "summary_text": summary_text,
            "updated_at": _utc_now_iso(),
        }
        if last_summarized_conversation_id is not None:
            payload["last_summarized_conversation_id"] = last_summarized_conversation_id
        self._client.table("ai_user_memories").upsert(
            payload, on_conflict="account_id"
        ).execute()

    async def get_or_create_conversation_state(
        self, conversation_id: str, account_id: str
    ) -> dict[str, Any] | None:
        if not self._client or not conversation_id or not account_id:
            return None
        return await asyncio.to_thread(
            self._get_or_create_conversation_state_sync, conversation_id, account_id
        )

    def _get_or_create_conversation_state_sync(
        self, conversation_id: str, account_id: str
    ) -> dict[str, Any] | None:
        try:
            resp = (
                self._client.table("ai_conversation_states")
                .select("conversation_id, account_id, context_injected, status, last_summarized_message_id")
                .eq("conversation_id", conversation_id)
                .limit(1)
                .execute()
            )
            rows = resp.data or []
            if rows:
                return rows[0]

            now = _utc_now_iso()
            insert_payload = {
                "conversation_id": conversation_id,
                "account_id": account_id,
                "context_injected": False,
                "status": "active",
                "last_active_at": now,
                "updated_at": now,
            }
            created = (
                self._client.table("ai_conversation_states")
                .insert(insert_payload)
                .execute()
            )
            return (created.data or [insert_payload])[0]
        except Exception as exc:
            logger.warning(
                "Failed to get/create ai_conversation_states for %s: %s",
                conversation_id,
                exc,
            )
            return None

    async def mark_context_injected_and_touch(
        self, conversation_id: str, account_id: str
    ) -> None:
        if not self._client or not conversation_id:
            return
        await asyncio.to_thread(
            self._update_conversation_state_sync,
            conversation_id,
            account_id,
            True,
        )

    async def touch_conversation(self, conversation_id: str, account_id: str) -> None:
        if not self._client or not conversation_id:
            return
        await asyncio.to_thread(
            self._update_conversation_state_sync,
            conversation_id,
            account_id,
            None,
        )

    def _update_conversation_state_sync(
        self,
        conversation_id: str,
        account_id: str,
        context_injected: bool | None,
    ) -> None:
        now = _utc_now_iso()
        payload: dict[str, Any] = {
            "account_id": account_id,
            "status": "active",
            "last_active_at": now,
            "updated_at": now,
        }
        if context_injected is not None:
            payload["context_injected"] = context_injected
        try:
            (
                self._client.table("ai_conversation_states")
                .update(payload)
                .eq("conversation_id", conversation_id)
                .execute()
            )
        except Exception as exc:
            logger.warning(
                "Failed to update ai_conversation_states for %s: %s",
                conversation_id,
                exc,
            )
