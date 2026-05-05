import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from .config import DB_PATH


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _utc_day() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                ts TEXT NOT NULL,
                day TEXT NOT NULL,
                UNIQUE(name, day)
            )
            """
        )
        conn.commit()


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def mark_attendance(name: str) -> bool:
    """
    Insert attendance for name if not already present for today's UTC day.
    Returns True if a new row was inserted.
    """
    ts = _utc_now_iso()
    day = _utc_day()
    try:
        with get_conn() as conn:
            cur = conn.execute(
                "INSERT INTO attendance (name, ts, day) VALUES (?, ?, ?)",
                (name, ts, day),
            )
            conn.commit()
            return cur.rowcount > 0
    except sqlite3.IntegrityError:
        return False


def list_attendance(date_filter: str | None = None) -> list[dict]:
    with get_conn() as conn:
        if date_filter:
            rows = conn.execute(
                """
                SELECT id, name, ts, day
                FROM attendance
                WHERE day = ?
                ORDER BY ts DESC
                """,
                (date_filter,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, name, ts, day
                FROM attendance
                ORDER BY ts DESC
                """
            ).fetchall()
        return [dict(r) for r in rows]


def clear_attendance() -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM attendance")
        conn.commit()
