import logging
from urllib.parse import quote
from typing import Optional

from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from jose import jwt, JWTError
from authlib.integrations.starlette_client import OAuth
from pydantic import BaseModel

from app.config import get_config
from app.auth.service import AuthService
from app.extensions import SessionLocal, JWT_SECRET_KEY, JWT_ALGORITHM
from app.models.user import User
from app.utils.helpers import is_valid_email, sanitize_string

logger = logging.getLogger(__name__)
settings = get_config()()

# ── OAuth setup ───────────────────────────────────────────────────────────────
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url=settings.GOOGLE_DISCOVERY_URL,
    client_kwargs={'scope': 'openid email profile'},
)


# ── Pydantic request bodies ───────────────────────────────────────────────────
class RegisterBody(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None


class LoginBody(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None


# ── JWT dependency ────────────────────────────────────────────────────────────
def get_current_user_id(request: Request) -> str:
    """Extracts and verifies JWT from Authorization header. Returns user_id (str)."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")
    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload.")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


# ── Controller ────────────────────────────────────────────────────────────────
class AuthController:
    @staticmethod
    async def register(body: RegisterBody):
        """POST /api/auth/register"""
        try:
            name = sanitize_string(body.name)
            company = sanitize_string(body.company)
            email = sanitize_string(body.email)
            password = body.password

            if not name or not email or not password:
                return JSONResponse(
                    {'success': False, 'message': 'Name, email, and password are required.'},
                    status_code=400,
                )

            if not is_valid_email(email):
                return JSONResponse(
                    {'success': False, 'message': 'Invalid email address format.'},
                    status_code=400,
                )

            user, token = AuthService.register_local_user(name, company, email, password)

            return JSONResponse(
                {
                    'success': True,
                    'message': 'Account registered successfully.',
                    'token': token,
                    'user': user.to_dict(),
                },
                status_code=201,
            )
        except ValueError as e:
            return JSONResponse({'success': False, 'message': str(e)}, status_code=400)
        except Exception as e:
            logger.error(f"Registration Error: {str(e)}")
            return JSONResponse(
                {'success': False, 'message': 'An error occurred during registration.'},
                status_code=500,
            )

    @staticmethod
    async def login(body: LoginBody):
        """POST /api/auth/login"""
        try:
            email = sanitize_string(body.email)
            password = body.password

            if not email or not password:
                return JSONResponse(
                    {'success': False, 'message': 'Email and password are required.'},
                    status_code=400,
                )

            user, token = AuthService.login_local_user(email, password)

            return JSONResponse(
                {
                    'success': True,
                    'message': 'Login successful.',
                    'token': token,
                    'user': user.to_dict(),
                },
                status_code=200,
            )
        except ValueError as e:
            return JSONResponse({'success': False, 'message': str(e)}, status_code=401)
        except Exception as e:
            logger.error(f"Login Error: {str(e)}")
            return JSONResponse(
                {'success': False, 'message': 'An error occurred during login.'},
                status_code=500,
            )

    @staticmethod
    async def google_login(request: Request):
        """GET /api/auth/google — Redirects user to Google OAuth screen."""
        # Read fresh from config each request (ensures .env is fully loaded)
        cfg = get_config()()
        redirect_uri = cfg.GOOGLE_CALLBACK_URL
        logger.info(f"[OAuth] Google OAuth started — redirect_uri={redirect_uri}")
        return await oauth.google.authorize_redirect(request, redirect_uri)

    @staticmethod
    async def google_callback(request: Request):
        """GET /api/auth/google/callback — Handles Google OAuth response."""
        cfg = get_config()()
        frontend_url = cfg.FRONTEND_URL
        logger.info("[OAuth] Google callback received")

        try:
            # Handle user cancellation or error query params
            error_reason = request.query_params.get('error')
            if error_reason:
                logger.warning(f"[OAuth] Google login denied by user: {error_reason}")
                error_msg = quote(f"Google login cancelled or denied: {error_reason}")
                return RedirectResponse(url=f"{frontend_url}/auth?error={error_msg}")

            logger.info("[OAuth] Authorization code received — exchanging for tokens")

            # Obtain token and userinfo from Google via Authlib
            token_data = await oauth.google.authorize_access_token(request)
            logger.info("[OAuth] Google token exchange successful")

            userinfo = token_data.get('userinfo')
            if not userinfo:
                userinfo = await oauth.google.userinfo(request)

            if not userinfo or not userinfo.get('email'):
                logger.error("[OAuth] Google profile missing email — aborting")
                error_msg = quote("Google authentication failed. Missing email profile data.")
                return RedirectResponse(url=f"{frontend_url}/auth?error={error_msg}")

            logger.info(f"[OAuth] Google profile retrieved — email={userinfo.get('email')}")

            user, jwt_token = AuthService.find_or_create_google_user(dict(userinfo))
            logger.info(f"[OAuth] User found/created — id={user.id}, provider={user.provider}")
            logger.info("[OAuth] JWT issued — redirecting to frontend")

            # Redirect user back to frontend with generated JWT
            return RedirectResponse(url=f"{frontend_url}/auth?token={jwt_token}")

        except Exception as e:
            logger.error(f"[OAuth] Google Callback Error: {str(e)}")
            error_msg = quote(str(e) or "Google OAuth authentication failed.")
            return RedirectResponse(url=f"{frontend_url}/auth?error={error_msg}")

    @staticmethod
    async def logout():
        """GET|POST /api/auth/logout"""
        return JSONResponse({'success': True, 'message': 'Logged out successfully.'}, status_code=200)

    @staticmethod
    async def get_me(current_user_id: str = Depends(get_current_user_id)):
        """GET /api/auth/me — Returns authenticated user profile."""
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == int(current_user_id)).first() if current_user_id else None

            if not user:
                return JSONResponse({'success': False, 'message': 'User profile not found.'}, status_code=404)

            return JSONResponse({'success': True, 'user': user.to_dict()}, status_code=200)
        finally:
            db.close()
