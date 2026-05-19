from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
BACKEND_ROOT = PROJECT_ROOT / "backend"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(default="Conversational AI Platform", validation_alias="APP_NAME")
    app_env: str = Field(default="development", validation_alias="APP_ENV")
    debug: bool = Field(default=True, validation_alias="APP_DEBUG")
    log_level: str = Field(default="INFO", validation_alias="APP_LOG_LEVEL")

    secret_key: str = Field(default="change-me-in-production", validation_alias="SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, validation_alias="REFRESH_TOKEN_EXPIRE_DAYS")
    reset_token_expire_minutes: int = Field(default=15, validation_alias="RESET_TOKEN_EXPIRE_MINUTES")

    database_url: str = Field(
        default="sqlite+aiosqlite:///./data/memory_chat.db",
        validation_alias="DATABASE_URL",
    )

    groq_api_key: str = Field(default="", validation_alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", validation_alias="GROQ_MODEL")

    frontend_url: str = Field(default="http://localhost:5173", validation_alias="FRONTEND_URL")

    smtp_host: str = Field(default="localhost", validation_alias="SMTP_HOST")
    smtp_port: int = Field(default=1025, validation_alias="SMTP_PORT")
    smtp_user: str = Field(default="", validation_alias="SMTP_USER")
    smtp_password: str = Field(default="", validation_alias="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(default=True, validation_alias="SMTP_USE_TLS")
    smtp_timeout_seconds: int = Field(default=30, validation_alias="SMTP_TIMEOUT_SECONDS")
    email_mock_enabled: bool = Field(default=False, validation_alias="EMAIL_MOCK_ENABLED")
    emails_from_email: str = Field(
        default="noreply@conversational-ai.com",
        validation_alias="EMAILS_FROM_EMAIL",
    )
    emails_from_name: str = Field(
        default="Conversational AI Platform",
        validation_alias="EMAILS_FROM_NAME",
    )

    token_budget_total: int = Field(default=4000, validation_alias="TOKEN_BUDGET_TOTAL")
    token_budget_system: int = Field(default=500, validation_alias="TOKEN_BUDGET_SYSTEM")
    token_budget_memory: int = Field(default=1000, validation_alias="TOKEN_BUDGET_MEMORY")
    token_budget_recent: int = Field(default=1500, validation_alias="TOKEN_BUDGET_RECENT")
    token_budget_response: int = Field(default=1000, validation_alias="TOKEN_BUDGET_RESPONSE")

    summary_interval: int = Field(default=5, validation_alias="SUMMARY_INTERVAL")
    max_recent_messages: int = Field(default=10, validation_alias="MAX_RECENT_MESSAGES")
    auto_switch_threshold: int = Field(default=15, validation_alias="AUTO_SWITCH_THRESHOLD")

    @field_validator("app_env")
    @classmethod
    def normalize_app_env(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("log_level")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("smtp_host", "smtp_user", "emails_from_email")
    @classmethod
    def normalize_email_settings(cls, value: str) -> str:
        return value.strip()

    @field_validator("smtp_password")
    @classmethod
    def normalize_smtp_password(cls, value: str) -> str:
        return value.strip()

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origins(self) -> list[str]:
        origins = {
            self.frontend_url.rstrip("/"),
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        }
        return sorted(origin for origin in origins if origin)

    def validate_runtime(self) -> None:
        """Fail fast for unsafe production configuration."""
        if not self.is_production:
            return

        issues: list[str] = []
        if self.debug:
            issues.append("APP_DEBUG must be false in production")
        if self.secret_key == "change-me-in-production":
            issues.append("SECRET_KEY must be set to a non-default value")
        if not self.groq_api_key:
            issues.append("GROQ_API_KEY must be configured in production")
        if self.email_mock_enabled:
            issues.append("EMAIL_MOCK_ENABLED must be false in production")
        if not self.smtp_host:
            issues.append("SMTP_HOST must be configured in production")
        if not self.smtp_user:
            issues.append("SMTP_USER must be configured in production")
        if not self.smtp_password:
            issues.append("SMTP_PASSWORD must be configured in production")
        if self.smtp_host.lower() == "smtp.gmail.com":
            app_password = self.smtp_password.replace(" ", "")
            if len(app_password) != 16:
                issues.append(
                    "SMTP_PASSWORD must be a valid 16-character Gmail App Password when using smtp.gmail.com"
                )

        if issues:
            raise ValueError("Invalid production configuration: " + "; ".join(issues))


@lru_cache
def get_settings() -> Settings:
    return Settings()
