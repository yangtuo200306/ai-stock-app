import hashlib
import logging
import secrets
import sqlite3
from pathlib import Path
from uuid import uuid4

from fastapi import Header

from app.config.settings import settings
from app.errors import ErrorCode, api_error

DATABASE_PATH = Path(__file__).resolve().parent.parent / settings.DATABASE_PATH

logger = logging.getLogger(__name__)

DEFAULT_USER_ID = "default_user"

# 数据库 Schema 版本管理
CURRENT_SCHEMA_VERSION = "V20260625_004_add_news_json"

MIGRATIONS = [
    {
        "version": "V20260625_001_initial_baseline",
        "description": "初始建表（users, tokens, stocks, analysis_tasks, reports, records, ask_sessions, ask_messages）",
    },
    {
        "version": "V20260625_002_migrate_stocks_unique",
        "description": "迁移 stocks 表唯一约束从 code 到 (user_id, code)",
    },
    {
        "version": "V20260625_003_ensure_columns",
        "description": "补充缺失列（report_id, user_id, session_id, updated_at）",
    },
    {
        "version": "V20260625_004_add_news_json",
        "description": "reports 表新增 news_json 列，用于存储相关新闻",
    },
]


def _ensure_schema_version_table(connection):
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_version (
            version TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def _get_applied_versions(connection) -> set[str]:
    rows = connection.execute("SELECT version FROM schema_version").fetchall()
    return {row["version"] for row in rows}


def _run_pending_migrations(connection):
    _ensure_schema_version_table(connection)
    applied = _get_applied_versions(connection)

    for migration in MIGRATIONS:
        if migration["version"] in applied:
            logger.debug("迁移已应用，跳过: %s - %s", migration["version"], migration["description"])
            continue

        logger.info("执行迁移: %s - %s", migration["version"], migration["description"])
        _run_migration(connection, migration["version"])
        connection.execute(
            "INSERT INTO schema_version (version, description) VALUES (?, ?)",
            (migration["version"], migration["description"]),
        )
        logger.info("迁移完成: %s", migration["version"])


def _run_migration(connection, version: str):
    if version == "V20260625_002_migrate_stocks_unique":
        _migrate_stocks_table(connection)
    elif version == "V20260625_003_ensure_columns":
        _run_ensure_columns(connection)
    elif version == "V20260625_004_add_news_json":
        ensure_column(connection, "reports", "news_json", "TEXT DEFAULT '[]'")


def _run_ensure_columns(connection):
    ensure_column(connection, "analysis_tasks", "report_id", "INTEGER")
    ensure_column(connection, "analysis_tasks", "user_id",
                  "TEXT NOT NULL DEFAULT 'default_user'")
    ensure_column(connection, "reports", "user_id",
                  "TEXT NOT NULL DEFAULT 'default_user'")
    ensure_column(connection, "stocks", "user_id",
                  "TEXT NOT NULL DEFAULT 'default_user'")
    ensure_column(connection, "records", "session_id", "TEXT")
    ensure_column(connection, "records", "updated_at", "TEXT")
    connection.execute(
        "UPDATE records SET updated_at = created_at WHERE updated_at IS NULL"
    )


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def ensure_column(connection, table_name, column_name, column_definition):
    columns = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    column_names = [column["name"] for column in columns]

    if column_name not in column_names:
        connection.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
        )


def _hash_password(password: str) -> tuple[str, str]:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return h.hex(), salt


def _verify_password(password: str, stored_hash: str, salt: str) -> bool:
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return h.hex() == stored_hash


def _migrate_stocks_table(connection):
    """Migrate stocks table unique constraint from code to (user_id, code)."""
    indexes = connection.execute("PRAGMA index_list(stocks)").fetchall()
    for index in indexes:
        if not index["unique"]:
            continue
        index_columns = connection.execute(
            f"PRAGMA index_info({index['name']})"
        ).fetchall()
        column_names = [column["name"] for column in index_columns]
        if column_names == ["user_id", "code"]:
            return

    connection.execute("""
        CREATE TABLE stocks_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            user_id TEXT NOT NULL DEFAULT 'default_user',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, code)
        )
    """)
    connection.execute("""
        INSERT INTO stocks_new (id, code, name, user_id, created_at)
        SELECT id, code, name, user_id, created_at FROM stocks
    """)
    connection.execute("DROP TABLE stocks")
    connection.execute("ALTER TABLE stocks_new RENAME TO stocks")


def get_current_user_id(authorization: str = Header(...)) -> str:
    """Extract current user ID from Authorization header."""
    if not authorization.startswith("Bearer "):
        raise api_error(401, ErrorCode.INVALID_TOKEN_FORMAT, "Token 格式无效")

    token = authorization[7:]
    with get_connection() as connection:
        row = connection.execute(
            "SELECT user_id FROM tokens WHERE token = ?",
            (token,),
        ).fetchone()

    if row is None:
        raise api_error(401, ErrorCode.INVALID_TOKEN, "Token 无效，请重新登录")

    return str(row["user_id"])


def init_db():
    logger.info("数据库初始化开始，路径: %s", DATABASE_PATH)
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS stocks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                user_id TEXT NOT NULL DEFAULT 'default_user',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS analysis_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL UNIQUE,
                stock_code TEXT NOT NULL,
                status TEXT NOT NULL,
                progress INTEGER NOT NULL,
                message TEXT NOT NULL,
                report_id INTEGER,
                user_id TEXT NOT NULL DEFAULT 'default_user',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stock_code TEXT NOT NULL,
                stock_name TEXT NOT NULL,
                price REAL NOT NULL,
                score INTEGER NOT NULL,
                action TEXT NOT NULL,
                trend TEXT NOT NULL,
                summary TEXT NOT NULL,
                risks_json TEXT NOT NULL,
                indicators_json TEXT NOT NULL,
                user_id TEXT NOT NULL DEFAULT 'default_user',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                record_type TEXT NOT NULL,
                stock_code TEXT NOT NULL,
                stock_name TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                question TEXT,
                answer TEXT,
                answer_type TEXT,
                report_id INTEGER,
                metadata_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ask_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL UNIQUE,
                user_id TEXT NOT NULL,
                stock_code TEXT NOT NULL,
                stock_name TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                last_question TEXT,
                last_answer TEXT,
                answer_type TEXT,
                ai_status TEXT,
                model TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ask_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                answer_type TEXT,
                ai_status TEXT,
                model TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        # 执行版本化迁移
        _run_pending_migrations(connection)

    logger.info("数据库初始化完成，当前 Schema 版本: %s", CURRENT_SCHEMA_VERSION)
