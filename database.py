import logging
from pathlib import Path

import psycopg2
import psycopg2.extras
from psycopg2 import pool

from config import DATABASE_URL

logger = logging.getLogger(__name__)
_pool = None


def init_db():
    global _pool
    _pool = psycopg2.pool.ThreadedConnectionPool(1, 10, DATABASE_URL)
    logger.info("[DB] Pool inicializado")
    _run_migrations()


def _run_migrations():
    sql_path = Path(__file__).parent / "migrations" / "001_init.sql"
    sql = sql_path.read_text(encoding="utf-8")
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        logger.info("[DB] Migraciones aplicadas")
    except Exception as e:
        conn.rollback()
        logger.error(f"[DB] Error aplicando migraciones: {e}")
        raise
    finally:
        release_conn(conn)


def get_conn():
    return _pool.getconn()


def release_conn(conn):
    _pool.putconn(conn)


def close_db():
    if _pool:
        _pool.closeall()
        logger.info("[DB] Pool cerrado")


def execute(query: str, params: tuple = None, fetch: bool = False, fetchone: bool = False):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            conn.commit()
            if fetchone:
                row = cur.fetchone()
                return dict(row) if row else None
            if fetch:
                return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        conn.rollback()
        logger.error(f"[DB] Error ejecutando query: {e}")
        raise
    finally:
        release_conn(conn)


def health_check() -> bool:
    try:
        execute("SELECT 1", fetchone=True)
        return True
    except Exception as e:
        logger.error(f"[DB] Health check falló: {e}")
        return False
