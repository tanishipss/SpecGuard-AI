"""add full_name to users (separate from email identity)

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-16

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "full_name")
