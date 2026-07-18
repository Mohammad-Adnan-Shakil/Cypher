"""
Central config for Cypher.
Every agent/tool/orchestrator module imports `settings` from here —
no module should call os.getenv() directly. Keeps env access in one place.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    groq_api_key: str = ""

    # Web search
    tavily_api_key: str = ""

    # Database
    database_url: str = "postgresql://user:password@localhost:5432/cypher"

    # Telegram
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # Gmail OAuth
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    gmail_refresh_token: str = ""

    # App
    app_env: str = "development"


settings = Settings()