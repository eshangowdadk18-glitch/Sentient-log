from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # ClickHouse Settings
    CLICKHOUSE_URL: str = "localhost"
    CLICKHOUSE_PORT: int = 8123
    CLICKHOUSE_USER: str = "sentient"
    CLICKHOUSE_PASSWORD: str = "strongpassword123"
    CLICKHOUSE_DATABASE: str = "sentient_log"

    # OpenAI / Groq Settings
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.groq.com/openai/v1"
    OPENAI_MODEL: str = "llama-3.3-70b-versatile"

    # MongoDB Settings
    MONGODB_URI: str = "mongodb://sentient:sentientpassword@localhost:27018/?authSource=admin"
    MONGODB_DB_NAME: str = "sentient_auth"

    # JWT Settings
    JWT_SECRET_KEY: str = "change_this_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
