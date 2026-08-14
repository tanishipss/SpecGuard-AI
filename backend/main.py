from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.api.chat import router as chat_router
from backend.api.eval import router as eval_router
from backend.api.ingest import router as ingest_router
from backend.api.retrieve import router as retrieve_router
from backend.config import settings
from backend.observability import configure_logging
from backend.rate_limit import limiter

configure_logging()

app = FastAPI(title="SpecGuard AI — 3GPP Standards RAG Chatbot")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router, prefix="/api/v1")
app.include_router(retrieve_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(eval_router, prefix="/api/v1")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
