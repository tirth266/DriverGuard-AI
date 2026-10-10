import os
from typing import Dict, List

from dotenv import load_dotenv

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_path = os.path.join(_backend_dir, ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
load_dotenv()


def resolve_from_backend(path: str) -> str:
    """Absolute path for a file referenced relative to the backend directory.

    Model paths never depend on the working directory the server was started in.
    """
    if not path or os.path.isabs(path):
        return path
    return os.path.normpath(os.path.join(_backend_dir, path))


# Values that shipped in this file or in app/extensions.py as placeholders. A
# deployment still carrying one of them is running on a publicly known key, so
# they are rejected by name rather than merely documented.
INSECURE_SECRETS = frozenset({
    "dev-secret-key-change-in-prod",
    "your_flask_secret_key_change_in_production",
    "jwt-secret-change-in-prod",
})


def require_secret(name: str, purpose: str) -> str:
    """
    Read a required secret from the environment or refuse to start.

    A signing key that falls back to a literal in the source tree is not a
    degraded configuration, it is a public one: anyone holding it can mint a
    valid session cookie or a valid JWT for any account. So there is no default
    here at all. Generate one with, for example:

        python -c "import secrets; print(secrets.token_urlsafe(64))"

    and put it in backend/.env, which is gitignored. The value is never logged
    or echoed, here or anywhere else.
    """
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise RuntimeError(
            f"{name} is not set. It is required to {purpose}. "
            f"Add it to backend/.env, for example: {name}=<python -c 'import secrets; "
            f"print(secrets.token_urlsafe(64))'>"
        )
    if value in INSECURE_SECRETS:
        raise RuntimeError(
            f"{name} is still set to a placeholder value that ships in the source tree. "
            f"Replace it in backend/.env with a random secret, for example: "
            f"{name}=<python -c 'import secrets; print(secrets.token_urlsafe(64))'>, "
            f"because anyone holding this value can forge a valid {purpose}."
        )
    return value


def missing_model_files(yolo_path: str, face_path: str, hand_path: str) -> List[Dict[str, str]]:
    """
    Required model files that are absent or empty, as {model, path} records.

    This is the only gate in front of model loading: a model file that is not
    already on disk is reported, never downloaded.
    """
    required = (("yolo", yolo_path), ("face", face_path), ("hand", hand_path))
    missing = []
    for model, path in required:
        if not path or not os.path.isfile(path) or os.path.getsize(path) == 0:
            missing.append({"model": model, "path": path})
    return missing


class Config:
    # ── App ────────────────────────────────────────────────────────────────
    # Signs the session cookie that carries the OAuth `state` CSRF value. No
    # default: see require_secret.
    SECRET_KEY: str = require_secret("SECRET_KEY", "sign the OAuth state cookie")
    APP_ENV: str = os.environ.get("FLASK_ENV", "development")

    # ── Database ───────────────────────────────────────────────────────────
    # NOTE: Required for authentication (register, login, Google OAuth, user lookup).
    # Set DATABASE_URL in environment. No default SQLite to avoid implicit file creation.
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

    # ── JWT ────────────────────────────────────────────────────────────────
    # The signing key and the token lifetime live in app.extensions, which is
    # the only module that reads them. They used to be declared here as well,
    # and a second copy of a secret is a second place for it to go stale.

    # ── CORS ───────────────────────────────────────────────────────────────
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    BACKEND_URL: str = os.environ.get("BACKEND_URL", "http://localhost:5000")

    # ── Google OAuth 2.0 ───────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_CALLBACK_URL: str = os.environ.get(
        "GOOGLE_CALLBACK_URL",
        "http://localhost:5000/api/auth/google/callback",
    )
    GOOGLE_DISCOVERY_URL: str = (
        "https://accounts.google.com/.well-known/openid-configuration"
    )

    # ── Local model files ───────────────────────────────────────────────────
    # Installed once by `python scripts/setup_models.py` and then only ever read
    # from disk. Every path resolves against the backend directory, so it never
    # depends on the working directory, and nothing here is fetched at runtime.
    # FACE_TASK_PATH / HAND_TASK_PATH win over the MEDIAPIPE_* names when both
    # are set, so one run can be pointed at a different file set.
    YOLO_MODEL_PATH: str = resolve_from_backend(
        os.environ.get("YOLO_MODEL_PATH", "models/trained/yolo11/detection/best.pt")
    )
    # NOTE: per-class detection confidences live in app.ai.yolo_service
    # (PHONE_CONF_THRESHOLD / CABIN_CONF_THRESHOLD) so they stay next to the
    # monitored class list they gate.

    # ── MediaPipe Tasks Vision (Face & Hand Landmarkers) ──────────────────
    MEDIAPIPE_FACE_MODEL_PATH: str = resolve_from_backend(
        os.environ.get("FACE_TASK_PATH")
        or os.environ.get("MEDIAPIPE_FACE_MODEL_PATH")
        or "models/mediapipe/face_landmarker.task"
    )
    MEDIAPIPE_HAND_MODEL_PATH: str = resolve_from_backend(
        os.environ.get("HAND_TASK_PATH")
        or os.environ.get("MEDIAPIPE_HAND_MODEL_PATH")
        or "models/mediapipe/hand_landmarker.task"
    )



class DevelopmentConfig(Config):
    DEBUG: bool = True


class ProductionConfig(Config):
    DEBUG: bool = False


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}


def get_config() -> type[Config]:
    env = os.environ.get("FLASK_ENV", "development")
    return config_map.get(env, DevelopmentConfig)
