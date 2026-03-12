import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

from db.database import Base, engine
import logging

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logging.basicConfig(level=logging.INFO)

DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))

if not all([DB_NAME, DB_USER, DB_PASSWORD]):
    raise ValueError("DB_NAME, DB_USER, and DB_PASSWORD must be set in .env")


def ensure_database_exists():
    """
    Ensure the PostgreSQL database exists.
    Connects to default 'postgres' DB and creates execusim if missing.
    """

    conn = psycopg2.connect(
        dbname="postgres",
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )

    conn.autocommit = True
    cur = conn.cursor()

    cur.execute(
        "SELECT 1 FROM pg_database WHERE datname=%s",
        (DB_NAME,)
    )

    exists = cur.fetchone()

    if not exists:
        logging.info("Database does not exist. Creating database execusim...")
        cur.execute(f"CREATE DATABASE {DB_NAME}")
        logging.info("Database created.")
    else:
        logging.info("Database already exists.")

    cur.close()
    conn.close()


def ensure_tables_exist():
    """
    Ensure SQLAlchemy tables exist using the shared engine from database.py.
    """
    # Import models so they register with Base.metadata
    import db.models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    logging.info("Tables ensured.")


def bootstrap_database():
    """
    Full bootstrap process.
    """
    ensure_database_exists()
    ensure_tables_exist()