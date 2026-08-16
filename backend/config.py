from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://specguard:specguard@localhost:5432/specguard"
    database_url_async: str = "postgresql+asyncpg://specguard:specguard@localhost:5432/specguard"

    google_api_key: str = ""
    gemini_model: str = "gemini-flash-lite-latest"

    embedding_model: str = "BAAI/bge-large-en-v1.5"
    embedding_dim: int = 1024
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    dense_top_k: int = 20
    sparse_top_k: int = 20
    rrf_k: int = 60
    fusion_pool_size: int = 30
    rerank_top_k: int = 8

    # Evidence gate thresholds (TRD §7.1). These are placeholders, not
    # calibrated values — ADR-4 requires tuning them empirically against the
    # evaluation set (§10) before relying on them in a demo.
    evidence_min_rerank_score: float = 0.0
    evidence_min_margin: float = 0.5
    evidence_min_supporting_chunks: int = 2
    evidence_definitional_score_bonus: float = 1.0

    chunk_min_tokens: int = 500
    chunk_max_tokens: int = 900
    chunk_overlap_tokens: int = 75

    default_release: str = "Rel-17"

    env: str = "development"
    cors_origins: str = "http://localhost:5173"

    # Security (TRD §11): input length limits and per-IP rate limits on the
    # LLM-backed endpoints, which are the expensive/abusable surface.
    max_question_length: int = 2000
    rate_limit_chat: str = "20/minute"
    rate_limit_eval: str = "2/minute"

    # Auth (signup/login/session) — separate concern from the RAG pipeline;
    # does not affect retrieval, generation, or evidence gating.
    jwt_secret_key: str = "dev-only-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440


settings = Settings()
