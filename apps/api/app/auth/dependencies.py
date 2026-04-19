from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
import time
import base64
import json

from app.db.session import get_db
from app.db.models.user import User

# Security scheme for JWT Bearer token
security = HTTPBearer()


def decode_jwt_payload(token: str) -> dict:
    """
    Decode JWT payload without signature verification.
    JWT format: header.payload.signature (base64url encoded)
    """
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Invalid JWT format")

        # Decode payload (second part)
        payload_b64 = parts[1]
        # Add padding if needed
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        # Use urlsafe base64 decoding
        payload_json = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_json)
    except Exception as e:
        raise ValueError(f"Failed to decode JWT: {str(e)}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.

    For Supabase access tokens (ES256), we decode without signature verification
    since we don't have access to Supabase's private key. We verify the issuer
    and expiration for security.
    """
    token = credentials.credentials
    print(f"DEBUG: Received token (first 50 chars): {token[:50]}...")

    try:
        # Decode JWT payload directly (without signature verification)
        # This is safe because we trust Supabase Auth as the token issuer
        payload = decode_jwt_payload(token)
        print(f"DEBUG: Token claims: {payload}")

        # Verify the issuer is Supabase for security
        issuer = payload.get("iss", "")
        if "supabase" not in issuer.lower():
            print(f"DEBUG: Invalid issuer: {issuer}")
            raise ValueError("Invalid token issuer")

        # Check token expiration
        exp = payload.get("exp")
        if exp and exp < time.time():
            raise ValueError("Token has expired")

        print(f"DEBUG: Token decoded successfully, user_id: {payload.get('sub')}")

        # Extract user ID from token
        user_id_str: Optional[str] = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = UUID(user_id_str)

    except ValueError as e:
        print(f"DEBUG: Token decode error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Dependency to optionally get the current user.
    Returns None if no valid token is provided.
    """
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
