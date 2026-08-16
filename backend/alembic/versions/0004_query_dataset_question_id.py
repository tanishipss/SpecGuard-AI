"""add dataset_question_id to queries (join key for ragas eval seeding)

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-17

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("queries", sa.Column("dataset_question_id", sa.String(16), nullable=True))
    op.create_index(
        "ix_queries_dataset_question_id",
        "queries",
        ["dataset_question_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_queries_dataset_question_id", table_name="queries")
    op.drop_column("queries", "dataset_question_id")
