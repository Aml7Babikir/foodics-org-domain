"""Shared SQLite DB used by both apps.

Resolution order for the DB path:
1. Explicit `FOODICS_SUBS_DB` env var (required for production).
2. If this file lives INSIDE an app folder (bundled copy) and a sibling
   `foodics_subscription_shared/` directory exists next to the app folder,
   use that sibling's `subscriptions.db` — this lets two sibling apps share
   one DB during local development.
3. Fall back to `<this directory>/subscriptions.db`.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


def _resolve_db_path() -> str:
    explicit = os.environ.get("FOODICS_SUBS_DB")
    if explicit:
        return explicit

    this_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(this_dir)
    sibling_shared = os.path.join(os.path.dirname(project_root), "foodics_subscription_shared")

    if (
        os.path.isdir(sibling_shared)
        and os.path.abspath(sibling_shared) != os.path.abspath(this_dir)
    ):
        return os.path.join(sibling_shared, "subscriptions.db")

    return os.path.join(this_dir, "subscriptions.db")


DB_PATH = _resolve_db_path()

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
