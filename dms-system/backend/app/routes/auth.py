from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt, verify_jwt_in_request
)
from app.extensions import db
from app.models import User, LoginHistory, UserRole
from app.config import Config
import requests
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def record_login_history(user_id, success=True, method='email'):
    try:
        history = LoginHistory(
            user_id=user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            login_method=method,
            success=success
        )
        db.session.add(history)
        db.session.commit()
    except Exception as e:
        logger.error(f"Failed to record login history: {e}")

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email', '').lower().strip()
    password = data.get('password', '')
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    
    if not email or not password or not first_name or not last_name:
        return jsonify({'error': 'All fields are required'}), 400
    
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        role=UserRole.DRIVER
    )
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    record_login_history(user.id, success=True, method='email')
    
    return jsonify({
        'message': 'Registration successful',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email', '').lower().strip()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        record_login_history(user.id if user else 0, success=False, method='email')
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 403
    
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    record_login_history(user.id, success=True, method='email')
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 401
    
    access_token = create_access_token(identity=user_id)
    return jsonify({'access_token': access_token}), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()['jti']
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200

@auth_bp.route('/google', methods=['GET'])
def google_login():
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={current_app.config['GOOGLE_CLIENT_ID']}&"
        f"redirect_uri={current_app.config['GOOGLE_REDIRECT_URI']}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return jsonify({'auth_url': google_auth_url}), 200

@auth_bp.route('/google/callback', methods=['GET'])
def google_callback():
    code = request.args.get('code')
    error = request.args.get('error')
    
    if error:
        return jsonify({'error': f'OAuth error: {error}'}), 400
    
    if not code:
        return jsonify({'error': 'Authorization code not provided'}), 400
    
    token_url = 'https://oauth2.googleapis.com/token'
    token_data = {
        'code': code,
        'client_id': current_app.config['GOOGLE_CLIENT_ID'],
        'client_secret': current_app.config['GOOGLE_CLIENT_SECRET'],
        'redirect_uri': current_app.config['GOOGLE_REDIRECT_URI'],
        'grant_type': 'authorization_code'
    }
    
    token_response = requests.post(token_url, data=token_data)
    token_json = token_response.json()
    
    if 'error' in token_json:
        return jsonify({'error': f'Token exchange failed: {token_json}'}), 400
    
    access_token = token_json.get('access_token')
    
    userinfo_response = requests.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    userinfo = userinfo_response.json()
    
    google_id = userinfo.get('id')
    email = userinfo.get('email', '').lower()
    first_name = userinfo.get('given_name', '')
    last_name = userinfo.get('family_name', '')
    avatar_url = userinfo.get('picture', '')
    
    user = User.query.filter_by(google_id=google_id).first()
    
    if not user:
        user = User.query.filter_by(email=email).first()
        if user:
            user.google_id = google_id
            user.avatar_url = avatar_url
            user.is_verified = True
    else:
        user.avatar_url = avatar_url
        user.is_verified = True
    
    if not user:
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            google_id=google_id,
            avatar_url=avatar_url,
            is_verified=True,
            role=UserRole.DRIVER
        )
        db.session.add(user)
    
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    record_login_history(user.id, success=True, method='google')
    
    frontend_url = current_app.config['FRONTEND_URL']
    redirect_url = f"{frontend_url}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
    
    return jsonify({
        'message': 'Google login successful',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token,
        'redirect_url': redirect_url
    }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email', '').lower().strip()
    
    if not email:
        return jsonify({'error': 'Email required'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'message': 'If the email exists, a reset link will be sent'}), 200
    
    return jsonify({'message': 'If the email exists, a reset link will be sent'}), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    password = data.get('password')
    
    if not token or not password:
        return jsonify({'error': 'Token and password required'}), 400
    
    return jsonify({'message': 'Password reset functionality to be implemented'}), 200