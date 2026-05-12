from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    """Central configuration loaded from the root .env file."""

    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- app ---
    app_name: str = "Conversational AI Platform"
    app_env: str = "development"
    debug: bool = True
    log_level: str = "info"

    # --- security ---
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # --- database ---
    database_url: str = "sqlite+aiosqlite:///./data/memory_chat.db"

    # --- groq ---
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # --- cors ---
    frontend_url: str = "http://localhost:5173"

    # --- token budget ---
    token_budget_total: int = 4000
    token_budget_system: int = 500
    token_budget_memory: int = 1000
    token_budget_recent: int = 1500
    token_budget_response: int = 1000

    # --- memory defaults ---
    summary_interval: int = 5
    max_recent_messages: int = 10
    auto_switch_threshold: int = 15

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
