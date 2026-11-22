"""Application settings loaded from environment variables or backend/.env."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. No secrets are hardcoded here."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    cors_origins: str = "http://localhost:3000"
    ai_provider: str = "mock"
    nexon_api_key: str | None = None
    nexon_base_url: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        """Return CORS origins as a list, splitting on commas."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return the cached settings instance."""
    return Settings()
