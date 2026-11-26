import logging

from app.clients.llm_client import LLMClient
from app.clients.memory_client import MemoryClient
from app.core.prompts import SUMMARY_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


class SummaryWorker:
    """Summarizes an ended/idle conversation and merges it with the user's prior memory."""

    def __init__(self, llm_client: LLMClient, memory_client: MemoryClient) -> None:
        self.llm_client = llm_client
        self.memory_client = memory_client

    async def summarize_conversation(
        self,
        conversation_id: str,
        account_id: str | None = None,
        messages_override: list[dict[str, str]] | None = None,
    ) -> bool:
        if not self.memory_client.is_configured() or not self.llm_client.is_configured():
            return False

        claimed = await self.memory_client.claim_conversation_for_summary(conversation_id)
        if claimed is None:
            # Already summarizing/closed, or not tracked yet.
            if not account_id or not messages_override:
                return False
            resolved_account_id = account_id
            after_message_id = None
        else:
            resolved_account_id = account_id or str(claimed.get("account_id") or "")
            after_message_id = claimed.get("last_summarized_message_id")

        if not resolved_account_id:
            if claimed is not None:
                await self.memory_client.release_conversation_claim(conversation_id)
            return False

        try:
            if messages_override:
                new_messages = [
                    {
                        "message_id": "",
                        "role": "user" if m["role"] == "user" else "assistant",
                        "text": m["text"].strip(),
                    }
                    for m in messages_override
                    if m.get("text", "").strip()
                ]
            else:
                new_messages = await self.memory_client.get_conversation_messages(
                    conversation_id=conversation_id,
                    after_message_id=after_message_id,
                )

            if not new_messages:
                if claimed is not None:
                    await self.memory_client.mark_conversation_closed(conversation_id)
                return False

            previous_summary = await self.memory_client.get_user_memory(resolved_account_id)
            transcript = "\n".join(
                f"{'Khách hàng' if m['role'] == 'user' else 'Selene AI'}: {m['text']}"
                for m in new_messages
            )

            prompt_parts = []
            if previous_summary:
                prompt_parts.append(f"Tóm tắt từ các phiên trước:\n{previous_summary}")
            prompt_parts.append(f"Nội dung cuộc trò chuyện mới:\n{transcript}")
            prompt = "\n\n".join(prompt_parts)

            new_summary = await self.llm_client.generate(
                messages=[{"role": "user", "content": prompt}],
                system_prompt=SUMMARY_SYSTEM_PROMPT,
                temperature=0.2,
                max_tokens=400,
            )

            if not new_summary:
                if claimed is not None:
                    await self.memory_client.release_conversation_claim(conversation_id)
                return False

            await self.memory_client.upsert_user_memory(
                account_id=resolved_account_id,
                summary_text=new_summary.strip(),
                last_summarized_conversation_id=conversation_id,
            )

            last_msg_id = new_messages[-1].get("message_id") or None
            if claimed is not None:
                await self.memory_client.mark_conversation_closed(
                    conversation_id=conversation_id,
                    last_summarized_message_id=last_msg_id,
                )
            logger.info(
                "Summarized conversation %s for account %s (%d new messages)",
                conversation_id,
                resolved_account_id,
                len(new_messages),
            )
            return True
        except Exception as exc:
            logger.error("SummaryWorker failed for %s: %s", conversation_id, exc)
            if claimed is not None:
                await self.memory_client.release_conversation_claim(conversation_id)
            return False
