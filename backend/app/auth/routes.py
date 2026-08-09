from fastapi import APIRouter
from app.auth.controller import AuthController

auth_router = APIRouter(prefix='/api/auth')

# Local Auth Routes
auth_router.add_api_route('/register', AuthController.register, methods=['POST'])
auth_router.add_api_route('/login', AuthController.login, methods=['POST'])

# Google OAuth Routes
auth_router.add_api_route('/google', AuthController.google_login, methods=['GET'])
auth_router.add_api_route('/google/callback', AuthController.google_callback, methods=['GET'])

# Logout & Profile Routes
auth_router.add_api_route('/logout', AuthController.logout, methods=['GET', 'POST'])
auth_router.add_api_route('/me', AuthController.get_me, methods=['GET'])
