"""
SADA Authentication Module
──────────────────────────
JWT-based register / login with bcrypt password hashing.
Email verification via 6-digit code sent through Gmail SMTP.
User documents are stored in the MongoDB `users` collection.
"""

from __future__ import annotations

import os
import logging
import random
import smtplib
import uuid
import requests
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, Field
from jose import JWTError, jwt
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # 7 days

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
SMTP_EMAIL = os.environ.get("SMTP_EMAIL", "")
SMTP_APP_PASSWORD = os.environ.get("SMTP_APP_PASSWORD", "")
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))

VERIFY_CODE_EXPIRE_MINUTES = 10  # Code valid for 10 minutes

# ── Password hashing ──────────────────────────────────────────────────────
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── OAuth2 bearer scheme ──────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# ── Pydantic schemas ──────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class VerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class ResendRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    message: str
    email: str


# ── Email helper ───────────────────────────────────────────────────────────
def _generate_code() -> str:
    """Generate a random 6-digit verification code."""
    return f"{random.randint(100000, 999999)}"


def _send_verification_email(to_email: str, code: str, username: str) -> bool:
    """Send verification code via Brevo API or Gmail SMTP. Returns True on success."""
    if not BREVO_API_KEY and (not SMTP_EMAIL or not SMTP_APP_PASSWORD):
        logger.warning(
            "Neither BREVO_API_KEY nor SMTP configured. "
            "Skipping email — code is: %s", code
        )
        print("\n" + "="*60)
        print(f"  [DEV MODE] KODE VERIFIKASI UNTUK {to_email}: {code}")
        print("="*60 + "\n")
        return True  # Allow registration to proceed in dev mode

    try:
        subject = f"SADA — Kode Verifikasi Anda: {code}"
        html_content = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 28px; font-weight: 700; color: #111; margin: 0;">SADA</h1>
                <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #888; margin-top: 4px;">
                    Auditory AI Detection
                </p>
            </div>
            <div style="background: #f8f8fa; border-radius: 16px; padding: 32px; text-align: center;">
                <p style="font-size: 15px; color: #333; margin: 0 0 8px;">
                    Halo <strong>{username}</strong>,
                </p>
                <p style="font-size: 14px; color: #666; margin: 0 0 24px;">
                    Masukkan kode berikut untuk verifikasi akun Anda:
                </p>
                <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111; font-family: monospace; margin: 0 0 16px;">
                    {code}
                </div>
                <p style="font-size: 12px; color: #999; margin: 0;">
                    Berlaku selama {VERIFY_CODE_EXPIRE_MINUTES} menit
                </p>
            </div>
            <p style="font-size: 12px; color: #aaa; text-align: center; margin-top: 24px;">
                Jika Anda tidak mendaftar di SADA, abaikan email ini.
            </p>
        </div>
        """

        if BREVO_API_KEY:
            # Menggunakan Brevo REST API (Bypasses SMTP port blocking)
            headers = {
                "accept": "application/json",
                "api-key": BREVO_API_KEY,
                "content-type": "application/json"
            }
            payload = {
                "sender": {"name": "SADA", "email": SMTP_EMAIL or "noreply@sada-detection.com"},
                "to": [{"email": to_email, "name": username}],
                "subject": subject,
                "htmlContent": html_content
            }
            res = requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
            res.raise_for_status()
            logger.info("Verification email sent via Brevo API to %s", to_email)
            return True
        else:
            # Fallback ke standar Gmail SMTP
            text = f"Halo {username},\n\nKode verifikasi SADA Anda: {code}\nBerlaku {VERIFY_CODE_EXPIRE_MINUTES} menit."
            msg = MIMEMultipart("alternative")
            msg["From"] = f"SADA <{SMTP_EMAIL}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
                server.send_message(msg)

            logger.info("Verification email sent via SMTP to %s", to_email)
            return True

    except Exception as e:
        logger.error("Failed to send verification email to %s: %s", to_email, e)
        return False

def _send_reset_email(to_email: str, code: str, username: str) -> bool:
    """Send reset password code via Brevo API or Gmail SMTP."""
    if not BREVO_API_KEY and (not SMTP_EMAIL or not SMTP_APP_PASSWORD):
        logger.warning("No email config. Skipping reset email — code is: %s", code)
        print("\n" + "="*60)
        print(f"  [DEV MODE] KODE RESET PASSWORD UNTUK {to_email}: {code}")
        print("="*60 + "\n")
        return True

    try:
        subject = f"SADA — Reset Password Anda: {code}"
        html_content = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 28px; font-weight: 700; color: #111; margin: 0;">SADA</h1>
            </div>
            <div style="background: #f8f8fa; border-radius: 16px; padding: 32px; text-align: center;">
                <p style="font-size: 15px; color: #333; margin: 0 0 8px;">Halo <strong>{username}</strong>,</p>
                <p style="font-size: 14px; color: #666; margin: 0 0 24px;">Ini adalah kode untuk mereset password akun SADA Anda:</p>
                <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111; font-family: monospace; margin: 0 0 16px;">{code}</div>
                <p style="font-size: 12px; color: #999; margin: 0;">Berlaku selama {VERIFY_CODE_EXPIRE_MINUTES} menit</p>
            </div>
            <p style="font-size: 12px; color: #aaa; text-align: center; margin-top: 24px;">Jika Anda tidak merasa meminta reset password, amankan akun Anda.</p>
        </div>
        """

        if BREVO_API_KEY:
            headers = {"accept": "application/json", "api-key": BREVO_API_KEY, "content-type": "application/json"}
            payload = {
                "sender": {"name": "SADA", "email": SMTP_EMAIL or "noreply@sada-detection.com"},
                "to": [{"email": to_email, "name": username}],
                "subject": subject,
                "htmlContent": html_content
            }
            res = requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
            res.raise_for_status()
            logger.info("Reset email sent via Brevo API to %s", to_email)
            return True
        else:
            text = f"Halo {username},\n\nKode reset SADA Anda: {code}\nBerlaku {VERIFY_CODE_EXPIRE_MINUTES} menit."
            msg = MIMEMultipart("alternative")
            msg["From"] = f"SADA <{SMTP_EMAIL}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
                server.send_message(msg)
            logger.info("Reset email sent via SMTP to %s", to_email)
            return True
    except Exception as e:
        logger.error("Failed to send reset email to %s: %s", to_email, e)
        return False


# ── JWT helpers ────────────────────────────────────────────────────────────
def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    """Return user_id or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


# ── Dependency: get current user ──────────────────────────────────────────
_db = None


def init_auth_db(database):
    """Called once from server.py lifespan to share the Motor database."""
    global _db
    _db = database


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    """
    FastAPI dependency — extracts and validates the JWT bearer token,
    looks up the user document, and returns it.
    Raises 401 if token is missing / invalid / user not found.
    """
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await _db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# ── Router ─────────────────────────────────────────────────────────────────
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


@auth_router.post("/register", response_model=MessageResponse, status_code=201)
async def register(body: RegisterRequest):
    """
    Step 1 of registration: validate input, store pending user with
    verification code, and send email.
    """
    # Check duplicate email in both verified users and pending
    existing = await _db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Generate verification code
    code = _generate_code()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=VERIFY_CODE_EXPIRE_MINUTES)

    pending_doc = {
        "id": str(uuid.uuid4()),
        "email": body.email,
        "username": body.username,
        "hashed_password": pwd_ctx.hash(body.password),
        "verification_code": code,
        "expires_at": expires_at.isoformat(),
        "created_at": now.isoformat(),
    }

    # Upsert: if they re-register before verifying, update the pending doc
    await _db.pending_users.update_one(
        {"email": body.email},
        {"$set": pending_doc},
        upsert=True,
    )

    # Send verification email
    sent = _send_verification_email(body.email, code, body.username)
    if not sent:
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification email. Please try again.",
        )

    logger.info("Registration pending for %s (%s)", body.username, body.email)
    return MessageResponse(
        message="Verification code sent to your email",
        email=body.email,
    )


@auth_router.post("/verify", response_model=TokenResponse)
async def verify_email(body: VerifyRequest):
    """
    Step 2 of registration: verify the code and activate the account.
    """
    pending = await _db.pending_users.find_one(
        {"email": body.email}, {"_id": 0}
    )
    if not pending:
        raise HTTPException(status_code=404, detail="No pending registration found")

    # Check expiry
    expires_at = datetime.fromisoformat(pending["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await _db.pending_users.delete_one({"email": body.email})
        raise HTTPException(status_code=410, detail="Verification code expired")

    # Check code
    if pending["verification_code"] != body.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Move to verified users
    user_doc = {
        "id": pending["id"],
        "email": pending["email"],
        "username": pending["username"],
        "hashed_password": pending["hashed_password"],
        "created_at": pending["created_at"],
    }

    # Double-check no duplicate (race condition)
    existing = await _db.users.find_one({"email": body.email})
    if existing:
        await _db.pending_users.delete_one({"email": body.email})
        raise HTTPException(status_code=409, detail="Email already registered")

    await _db.users.insert_one(user_doc)
    await _db.pending_users.delete_one({"email": body.email})

    logger.info("User verified and activated: %s (%s)", user_doc["username"], body.email)

    token = create_access_token(user_doc["id"])
    now = datetime.fromisoformat(user_doc["created_at"]) if isinstance(user_doc["created_at"], str) else user_doc["created_at"]

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_doc["id"],
            email=user_doc["email"],
            username=user_doc["username"],
            created_at=now,
        ),
    )


@auth_router.post("/resend", response_model=MessageResponse)
async def resend_code(body: ResendRequest):
    """Resend a new verification code for a pending registration."""
    pending = await _db.pending_users.find_one(
        {"email": body.email}, {"_id": 0}
    )
    if not pending:
        raise HTTPException(status_code=404, detail="No pending registration found")

    # Generate new code
    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFY_CODE_EXPIRE_MINUTES)

    await _db.pending_users.update_one(
        {"email": body.email},
        {"$set": {
            "verification_code": code,
            "expires_at": expires_at.isoformat(),
        }},
    )

    sent = _send_verification_email(body.email, code, pending["username"])
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send verification email")

    return MessageResponse(
        message="New verification code sent",
        email=body.email,
    )


@auth_router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = await _db.users.find_one({"email": body.email}, {"_id": 0})
    if not user or not pwd_ctx.verify(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            username=user["username"],
            created_at=(
                datetime.fromisoformat(user["created_at"])
                if isinstance(user["created_at"], str)
                else user["created_at"]
            ),
        ),
    )


@auth_router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(body: ForgotPasswordRequest):
    user = await _db.users.find_one({"email": body.email})
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")

    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFY_CODE_EXPIRE_MINUTES)

    await _db.users.update_one(
        {"email": body.email},
        {"$set": {"reset_code": code, "reset_expires_at": expires_at.isoformat()}}
    )

    sent = _send_reset_email(body.email, code, user["username"])
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send reset email")

    return MessageResponse(message="Reset code sent to your email", email=body.email)


@auth_router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest):
    user = await _db.users.find_one({"email": body.email})
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")

    reset_code = user.get("reset_code")
    reset_expires_at_str = user.get("reset_expires_at")

    if not reset_code or not reset_expires_at_str:
        raise HTTPException(status_code=400, detail="No reset code was requested")

    if reset_code != body.code:
        raise HTTPException(status_code=400, detail="Invalid reset code")

    expires_at = datetime.fromisoformat(reset_expires_at_str)
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset code has expired")

    hashed_pw = pwd_ctx.hash(body.new_password)
    await _db.users.update_one(
        {"email": body.email},
        {
            "$set": {"hashed_password": hashed_pw},
            "$unset": {"reset_code": "", "reset_expires_at": ""}
        }
    )

    return MessageResponse(message="Password successfully reset", email=body.email)


@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        username=current_user["username"],
        created_at=(
            datetime.fromisoformat(current_user["created_at"])
            if isinstance(current_user["created_at"], str)
            else current_user["created_at"]
        ),
    )
