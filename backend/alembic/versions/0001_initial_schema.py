"""initial schema: documents, chunks, queries

Revision ID: 0001
Revises:
Create Date: 2026-08-13

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EMBEDDING_DIM = 1024


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("spec_number", sa.String(32), nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("release", sa.String(16), nullable=False),
        sa.Column("version", sa.String(32), nullable=False),
        sa.Column("source_file", sa.Text, nullable=False),
        sa.Column("document_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_documents_spec_number", "documents", ["spec_number"])
    op.create_index("ix_documents_release", "documents", ["release"])
    op.create_index("ix_documents_spec_release", "documents", ["spec_number", "release"])

    op.create_table(
        "chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("section", sa.String(64), nullable=False),
        sa.Column("subsection", sa.String(64), nullable=True),
        sa.Column("section_title", sa.Text, nullable=False),
        sa.Column("page_start", sa.Integer, nullable=False),
        sa.Column("page_end", sa.Integer, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("parent_context", sa.Text, nullable=True),
        sa.Column(
            "tsv",
            postgresql.TSVECTOR,
            sa.Computed("to_tsvector('english', content)", persisted=True),
        ),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True),
        sa.Column("embedding_model_version", sa.String(64), nullable=True),
        sa.Column("token_count", sa.Integer, nullable=False),
    )
    op.create_index("ix_chunks_tsv", "chunks", ["tsv"], postgresql_using="gin")
    op.create_index("ix_chunks_document_section", "chunks", ["document_id", "section"])
    op.execute(
        "CREATE INDEX ix_chunks_embedding_hnsw ON chunks "
        "USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)"
    )

    op.create_table(
        "queries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question", sa.Text, nullable=False),
        sa.Column("retrieved_chunk_ids", postgresql.ARRAY(sa.String), nullable=False, server_default="{}"),
        sa.Column("rerank_scores", postgresql.ARRAY(sa.Float), nullable=False, server_default="{}"),
        sa.Column("evidence_sufficient", sa.Boolean, nullable=False),
        sa.Column("generated_answer", sa.Text, nullable=True),
        sa.Column("citations", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("grounding_verdict", sa.String(16), nullable=True),
        sa.Column("latency_ms", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("queries")
    op.execute("DROP INDEX IF EXISTS ix_chunks_embedding_hnsw")
    op.drop_index("ix_chunks_document_section", table_name="chunks")
    op.drop_index("ix_chunks_tsv", table_name="chunks")
    op.drop_table("chunks")
    op.drop_index("ix_documents_spec_release", table_name="documents")
    op.drop_index("ix_documents_release", table_name="documents")
    op.drop_index("ix_documents_spec_number", table_name="documents")
    op.drop_table("documents")
