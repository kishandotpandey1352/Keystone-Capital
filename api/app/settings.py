from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-me"

    finnhub_api_key: str | None = None
    finnhub_base_url: str = "https://finnhub.io/api/v1"

settings = Settings()
