from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/spendsmart"

    # Supabase
    supabase_url: str = "http://localhost:54321"
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # JWT
    jwt_secret: str = "your-super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    def get_cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string or JSON array."""
        v = self.cors_origins
        if v.startswith("["):
            import json
            return json.loads(v)
        return [origin.strip() for origin in v.split(",") if origin.strip()]

    # ML Runtime
    ml_runtime: str = "ollama"  # ollama or huggingface
    ollama_base_url: str = "http://localhost:11434"
    hf_api_token: str = ""

    # External APIs
    yahoo_finance_enabled: bool = True
    exchange_rate_api_url: str = "https://api.frankfurter.app"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Environment
    python_env: str = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
