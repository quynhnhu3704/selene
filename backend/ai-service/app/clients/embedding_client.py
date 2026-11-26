import hashlib
import math
import re
import unicodedata
from typing import Iterable

import httpx

from app.core.config import settings


def _normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text.lower().strip())
    return re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)


def _extract_tokens(text: str) -> list[str]:
    normalized = _normalize_text(text)
    words = [w for w in normalized.split() if w]
    tokens: list[str] = list(words)

    for i in range(len(words) - 1):
        tokens.append(f"{words[i]}_{words[i + 1]}")

    for word in words:
        if len(word) >= 3:
            for i in range(len(word) - 2):
                tokens.append(f"c:{word[i : i + 3]}")

    return tokens


def _local_hash_embedding(text: str, dim: int) -> list[float]:
    """Zero-dependency deterministic feature-hashing embedding for local dev/testing."""
    vector = [0.0] * dim
    tokens = _extract_tokens(text)
    if not tokens:
        return vector

    for token in tokens:
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
        h = int.from_bytes(digest, "little")
        idx = h % dim
        sign = 1.0 if ((h >> 1) & 1) == 0 else -1.0
        weight = 1.5 if "_" in token else (0.5 if token.startswith("c:") else 1.0)
        vector[idx] += sign * weight

    norm = math.sqrt(sum(v * v for v in vector))
    if norm > 0:
        vector = [v / norm for v in vector]
    return vector


class EmbeddingClient:
    """Generates vector embeddings via Jina, Gemini, OpenAI, Ollama, or local hashing."""

    def __init__(self) -> None:
        self.provider = settings.embedding_provider.lower()
        self.model = settings.embedding_model
        self.dim = settings.embedding_dim

    async def embed_text(self, text: str, task: str = "retrieval.query") -> list[float]:
        if self.provider == "jina" and settings.jina_api_key:
            return await self._embed_jina(text, task=task)
        if self.provider == "gemini" and settings.gemini_api_key:
            return await self._embed_gemini(text)
        if self.provider == "openai" and settings.openai_api_key:
            return await self._embed_openai(text)
        if self.provider == "ollama":
            return await self._embed_ollama(text)
        return _local_hash_embedding(text, self.dim)

    async def embed_batch(
        self, texts: Iterable[str], task: str = "retrieval.passage"
    ) -> list[list[float]]:
        return [await self.embed_text(text, task=task) for text in texts]

    async def _embed_jina(self, text: str, task: str = "retrieval.query") -> list[float]:
        url = "https://api.jina.ai/v1/embeddings"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.jina_api_key}",
        }
        payload = {
            "model": self.model,
            "task": task,
            "dimensions": self.dim,
            "input": [text],
        }
        async with httpx.AsyncClient(timeout=settings.llm_timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["data"][0]["embedding"]

    async def _embed_gemini(self, text: str) -> list[float]:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:embedContent"
        )
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": settings.gemini_api_key,
        }
        payload = {"content": {"parts": [{"text": text}]}}
        async with httpx.AsyncClient(timeout=settings.llm_timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["embedding"]["values"]

    async def _embed_openai(self, text: str) -> list[float]:
        url = f"{settings.openai_base_url.rstrip('/')}/embeddings"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.openai_api_key}",
        }
        payload = {"model": self.model, "input": text}
        async with httpx.AsyncClient(timeout=settings.llm_timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["data"][0]["embedding"]

    async def _embed_ollama(self, text: str) -> list[float]:
        url = f"{settings.ollama_base_url.rstrip('/')}/api/embeddings"
        payload = {"model": self.model, "prompt": text}
        async with httpx.AsyncClient(timeout=settings.llm_timeout) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["embedding"]
