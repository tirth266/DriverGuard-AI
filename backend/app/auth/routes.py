from flask import Blueprint
from app.auth.controller import AuthController

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Local Auth Routes
auth_bp.add_url_rule('/register', view_func=AuthController.register, methods=['POST'])
auth_bp.add_url_rule('/login', view_func=AuthController.login, methods=['POST'])

# Google OAuth Routes
auth_bp.add_url_rule('/google', view_func=AuthController.google_login, methods=['GET'])
auth_bp.add_url_rule('/google/callback', view_func=AuthController.google_callback, methods=['GET'])

# Logout & Profile Routes
auth_bp.add_url_rule('/logout', view_func=AuthController.logout, methods=['GET', 'POST'])
auth_bp.add_url_rule('/me', view_func=AuthController.get_me, methods=['GET'])
