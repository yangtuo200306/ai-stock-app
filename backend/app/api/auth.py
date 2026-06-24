from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, field_validator
import re

from app.database import (
    _hash_password,
    _verify_password,
    get_connection,
    get_current_user_id,
)

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
            raise HTTPException(
                status_code=400,
                detail={"message": "username already exists", "error": "username_exists"},
            )

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
            raise HTTPException(
                status_code=401,
                detail={"message": "invalid username or password", "error": "invalid_credentials"},
            )

        if not _verify_password(body.password, row["password_hash"], row["password_salt"]):
            raise HTTPException(
                status_code=401,
                detail={"message": "invalid username or password", "error": "invalid_credentials"},
            )

        token = str(uuid4())
        connection.execute(
            "INSERT INTO tokens (user_id, token) VALUES (?, ?)",
            (row["id"], token),
        )

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

    return {"message": "logout success"}


@router.get("/me")
def get_me(user_id: str = Depends(get_current_user_id)):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, username, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="user not found")

    return {
        "user_id": row["id"],
        "username": row["username"],
        "created_at": row["created_at"],
    }
