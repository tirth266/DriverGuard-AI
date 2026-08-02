import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dms-secret-key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dms-jwt-secret')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    JWT_REFRESH_TOKEN_EXPIRES = int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES', 2592000))
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_CSRF_IN_COOKIES = True

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///dms.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI')

    CAMERA_WIDTH = int(os.environ.get('CAMERA_WIDTH', 1280))
    CAMERA_HEIGHT = int(os.environ.get('CAMERA_HEIGHT', 720))
    CAMERA_FPS = int(os.environ.get('CAMERA_FPS', 30))
    CAMERA_MIRROR = os.environ.get('CAMERA_MIRROR', 'True').lower() == 'true'

    EAR_THRESHOLD = float(os.environ.get('EAR_THRESHOLD', 0.25))
    EAR_CONSECUTIVE_FRAMES = int(os.environ.get('EAR_CONSECUTIVE_FRAMES', 3))
    MAR_THRESHOLD = float(os.environ.get('MAR_THRESHOLD', 0.6))
    MAR_CONSECUTIVE_FRAMES = int(os.environ.get('MAR_CONSECUTIVE_FRAMES', 3))
    HEAD_POSE_THRESHOLD = float(os.environ.get('HEAD_POSE_THRESHOLD', 30))
    DROWSINESS_EAR_THRESHOLD = float(os.environ.get('DROWSINESS_EAR_THRESHOLD', 0.2))
    DROWSINESS_CONSECUTIVE_FRAMES = int(os.environ.get('DROWSINESS_CONSECUTIVE_FRAMES', 15))
    EYES_CLOSED_THRESHOLD = float(os.environ.get('EYES_CLOSED_THRESHOLD', 0.2))
    EYES_CLOSED_CONSECUTIVE_FRAMES = int(os.environ.get('EYES_CLOSED_CONSECUTIVE_FRAMES', 10))
    FACE_MISSING_THRESHOLD = int(os.environ.get('FACE_MISSING_THRESHOLD', 5))
    BRIGHTNESS_THRESHOLD = int(os.environ.get('BRIGHTNESS_THRESHOLD', 30))
    PHONE_DETECTION_CONFIDENCE = float(os.environ.get('PHONE_DETECTION_CONFIDENCE', 0.5))
    SMOKING_DETECTION_CONFIDENCE = float(os.environ.get('SMOKING_DETECTION_CONFIDENCE', 0.5))
    SEAT_BELT_DETECTION_CONFIDENCE = float(os.environ.get('SEAT_BELT_DETECTION_CONFIDENCE', 0.5))

    ALERT_COOLDOWN = int(os.environ.get('ALERT_COOLDOWN', 5))
    MAX_ALERTS_PER_MINUTE = int(os.environ.get('MAX_ALERTS_PER_MINUTE', 10))

    WEBSOCKET_PING_INTERVAL = int(os.environ.get('WEBSOCKET_PING_INTERVAL', 25))
    WEBSOCKET_PING_TIMEOUT = int(os.environ.get('WEBSOCKET_PING_TIMEOUT', 20))

    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

    CORS_ORIGINS = [
        FRONTEND_URL,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]

class DevelopmentConfig(Config):
    DEBUG = True
    FLASK_ENV = 'development'

class ProductionConfig(Config):
    DEBUG = False
    FLASK_ENV = 'production'
    JWT_COOKIE_SECURE = True

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}