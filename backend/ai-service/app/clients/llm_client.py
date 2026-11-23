import asyncio
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """Unified async LLM client supporting Gemini, OpenAI-compatible APIs, and Ollama."""

    def __init__(self) -> None:
        self.provider = settings.llm_provider.lower()
        self.model = settings.llm_model

    def is_configured(self) -> bool:
        if self.provider == "gemini":
            return bool(settings.gemini_api_key.strip())
        if self.provider == "openai":
            return bool(settings.openai_api_key.strip())
        if self.provider == "ollama":
            return bool(settings.ollama_base_url.strip())
        return False

    async def generate(
        self,
        messages: list[dict[str, str]],
        system_prompt: str = "",
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str | None:
        if not self.is_configured():
            return None

        temp = settings.llm_temperature if temperature is None else temperature
        tokens = settings.llm_max_tokens if max_tokens is None else max_tokens

        if self.provider == "gemini":
            return await self._generate_gemini(messages, system_prompt, temp, tokens)
        if self.provider == "openai":
            return await self._generate_openai(messages, system_prompt, temp, tokens)
        if self.provider == "ollama":
            return await self._generate_ollama(messages, system_prompt, temp, tokens)

        logger.warning("Unsupported LLM provider: %s", self.provider)
        return None

    async def _generate_gemini(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> str | None:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent"
        )
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": settings.gemini_api_key,
        }
        contents: list[dict[str, Any]] = [
            {
                "role": "user" if msg["role"] == "user" else "model",
                "parts": [{"text": msg["content"]}],
            }
            for msg in messages
        ]
        body: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system_prompt:
            body["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        async with httpx.AsyncClient(timeout=settings.llm_timeout) as client:
            for attempt in range(3):
                resp = await client.post(url, headers=headers, json=body)
                if resp.status_code in (429, 503) and attempt < 2:
                    logger.warning("Gemini API transient %s, retrying (%s/2)...", resp.status_code, attempt + 1)
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue
                if resp.is_error:
                    logger.error("Gemini API error %s: %s", resp.status_code, resp.text)
                resp.raise_for_status()
                data = resp.json()
                break

        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        text = "".join(
            part.get("text", "")
            for part in parts
            if not part.get("thought") and isinstance(part.get("text"), str)
        ).strip()
        return text or None

    async def _generate_openai(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> str | None:
        url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.openai_api_key}",
        }
        chat_messages: list[dict[str, str]] = []
        if system_prompt:
            chat_messages.append({"role": "system", "content": system_prompt})
        chat_messages.extend(
            {
                "role": "assistant" if m["role"] in ("assistant", "bot", "model") else "user",
                "content": m["content"],
            }
            for m in messages
        )
        body = {
            "model": self.model,
            "messages": chat_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=settings.llm_timeout) as client:
            resp = await client.post(url, headers=headers, json=body)
            if resp.is_error:
                logger.error("OpenAI-compatible API error %s: %s", resp.status_code, resp.text)
            resp.raise_for_status()
            data = resp.json()

        return data["choices"][0]["message"]["content"].strip() or None

    async def _generate_ollama(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> str | None:
        url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
        chat_messages: list[dict[str, str]] = []
        if system_prompt:
            chat_messages.append({"role": "system", "content": system_prompt})
        chat_messages.extend(
            {
                "role": "assistant" if m["role"] in ("assistant", "bot", "model") else "user",
                "content": m["content"],
            }
            for m in messages
        )
        body = {
            "model": self.model,
            "messages": chat_messages,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }

        async with httpx.AsyncClient(timeout=settings.llm_timeout) as client:
            resp = await client.post(url, json=body)
            resp.raise_for_status()
            data = resp.json()

        return data.get("message", {}).get("content", "").strip() or None
