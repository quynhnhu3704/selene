from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    app_name: str = "AI Service"
    app_version: str = "0.1.0"
    host: str = "0.0.0.0"
    port: int = 8006
    debug: bool = True

    # Qdrant
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_path: str = "./qdrant_data"
    qdrant_collection: str = "selene_products"

    # Embedding
    embedding_provider: str = "jina"  # jina | gemini | openai | ollama | local
    embedding_model: str = "jina-embeddings-v3"
    embedding_dim: int = 1024

    # LLM
    llm_provider: str = "gemini"  # gemini | openai | ollama
    llm_model: str = "gemini-3.8-flash"
    llm_temperature: float = 0.3
    llm_max_tokens: int = 1024
    llm_timeout: float = 60.0

    # Provider credentials & endpoints
    jina_api_key: str = ""
    gemini_api_key: str = ""
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    ollama_base_url: str = "http://localhost:11434"

    # Supabase (optional, used by sync_supabase.py)
    supabase_url: str = ""
    supabase_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
