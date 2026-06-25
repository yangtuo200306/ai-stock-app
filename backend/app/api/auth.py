import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, field_validator
import re

from app.database import (
    _hash_password,
    _verify_password,
    get_connection,
    get_current_user_id,
)
from app.errors import ErrorCode, api_error

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterCreate(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if len(v) < 3 or len(v) > 20:
            raise ValueError("username must be 3-20 characters")
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("username can only contain letters, numbers, and underscores")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("password must be at least 6 characters")
        return v


class LoginCreate(BaseModel):
    username: str
    password: str


@router.post("/register")
def register(body: RegisterCreate):
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM users WHERE username = ?",
            (body.username,),
        ).fetchone()

        if existing:
            logger.warning("注册失败，用户名已存在: %s", body.username)
            raise api_error(400, ErrorCode.USERNAME_EXISTS, "用户名已存在")

        password_hash, password_salt = _hash_password(body.password)
        cursor = connection.execute(
            "INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)",
            (body.username, password_hash, password_salt),
        )
        user_id = cursor.lastrowid

        token = str(uuid4())
        connection.execute(
            "INSERT INTO tokens (user_id, token) VALUES (?, ?)",
            (user_id, token),
        )

    logger.info("用户注册成功: id=%s, username=%s", user_id, body.username)
    return {
        "message": "register success",
        "user_id": user_id,
        "username": body.username,
        "token": token,
    }


@router.post("/login")
def login(body: LoginCreate):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, password_hash, password_salt FROM users WHERE username = ?",
            (body.username,),
        ).fetchone()

        if row is None:
            logger.warning("登录失败，用户不存在: %s", body.username)
            raise api_error(401, ErrorCode.INVALID_CREDENTIALS, "用户名或密码错误")

        if not _verify_password(body.password, row["password_hash"], row["password_salt"]):
            logger.warning("登录失败，密码错误: %s", body.username)
            raise api_error(401, ErrorCode.INVALID_CREDENTIALS, "用户名或密码错误")

        token = str(uuid4())
        connection.execute(
            "INSERT INTO tokens (user_id, token) VALUES (?, ?)",
            (row["id"], token),
        )

    logger.info("用户登录成功: id=%s, username=%s", row["id"], body.username)
    return {
        "message": "login success",
        "user_id": row["id"],
        "username": body.username,
        "token": token,
    }


@router.post("/logout")
def logout(
    user_id: str = Depends(get_current_user_id),
    authorization: str = Header(...),
):
    token = authorization[7:]
    with get_connection() as connection:
        connection.execute(
            "DELETE FROM tokens WHERE token = ? AND user_id = ?",
            (token, user_id),
        )

    logger.info("用户退出登录: id=%s", user_id)
    return {"message": "logout success"}


@router.get("/me")
def get_me(user_id: str = Depends(get_current_user_id)):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, username, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if row is None:
        raise api_error(404, ErrorCode.USER_NOT_FOUND, "用户不存在")

    return {
        "user_id": row["id"],
        "username": row["username"],
        "created_at": row["created_at"],
    }
