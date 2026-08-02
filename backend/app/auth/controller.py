from urllib.parse import quote
from flask import request, jsonify, redirect, current_app, session
from flask_jwt_extended import jwt_required, get_jwt_identity
from authlib.integrations.flask_client import OAuth
from app.auth.service import AuthService
from app.models.user import User
from app.utils.helpers import is_valid_email, sanitize_string

oauth = OAuth()

def init_oauth(app):
    """Initializes Authlib OAuth with Google credentials."""
    oauth.init_app(app)
    oauth.register(
        name='google',
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        server_metadata_url=app.config['GOOGLE_DISCOVERY_URL'],
        client_kwargs={'scope': 'openid email profile'},
    )

class AuthController:
    @staticmethod
    def register():
        """POST /api/auth/register"""
        try:
            data = request.get_json() or {}
            name = sanitize_string(data.get('name'))
            company = sanitize_string(data.get('company'))
            email = sanitize_string(data.get('email'))
            password = data.get('password')

            if not name or not email or not password:
                return jsonify({'success': False, 'message': 'Name, email, and password are required.'}), 400

            if not is_valid_email(email):
                return jsonify({'success': False, 'message': 'Invalid email address format.'}), 400

            user, token = AuthService.register_local_user(name, company, email, password)

            return jsonify({
                'success': True,
                'message': 'Account registered successfully.',
                'token': token,
                'user': user.to_dict()
            }), 201
        except ValueError as e:
            return jsonify({'success': False, 'message': str(e)}), 400
        except Exception as e:
            current_app.logger.error(f"Registration Error: {str(e)}")
            return jsonify({'success': False, 'message': 'An error occurred during registration.'}), 500

    @staticmethod
    def login():
        """POST /api/auth/login"""
        try:
            data = request.get_json() or {}
            email = sanitize_string(data.get('email'))
            password = data.get('password')

            if not email or not password:
                return jsonify({'success': False, 'message': 'Email and password are required.'}), 400

            user, token = AuthService.login_local_user(email, password)

            return jsonify({
                'success': True,
                'message': 'Login successful.',
                'token': token,
                'user': user.to_dict()
            }), 200
        except ValueError as e:
            return jsonify({'success': False, 'message': str(e)}), 401
        except Exception as e:
            current_app.logger.error(f"Login Error: {str(e)}")
            return jsonify({'success': False, 'message': 'An error occurred during login.'}), 500

    @staticmethod
    def google_login():
        """GET /api/auth/google — Redirects user to Google OAuth screen."""
        session.permanent = True
        redirect_uri = current_app.config['GOOGLE_CALLBACK_URL']
        return oauth.google.authorize_redirect(redirect_uri)

    @staticmethod
    def google_callback():
        """GET /api/auth/google/callback — Handles Google OAuth response."""
        frontend_url = current_app.config['FRONTEND_URL']
        
        try:
            # Handle user cancellation or error query params
            error_reason = request.args.get('error')
            if error_reason:
                error_msg = quote(f"Google login cancelled or denied: {error_reason}")
                return redirect(f"{frontend_url}/auth?error={error_msg}")

            # Obtain token and userinfo from Google via Authlib with explicit redirect_uri
            redirect_uri = current_app.config['GOOGLE_CALLBACK_URL']
            token_data = oauth.google.authorize_access_token(redirect_uri=redirect_uri)
            userinfo = token_data.get('userinfo')

            if not userinfo:
                userinfo = oauth.google.userinfo()

            if not userinfo or not userinfo.get('email'):
                error_msg = quote("Google authentication failed. Missing email profile data.")
                return redirect(f"{frontend_url}/auth?error={error_msg}")

            user, jwt_token = AuthService.find_or_create_google_user(userinfo)

            # Redirect user back to frontend with generated JWT
            return redirect(f"{frontend_url}/auth?token={jwt_token}")
        except Exception as e:
            current_app.logger.error(f"Google Callback Error: {str(e)}")
            error_msg = quote(str(e) or "Google OAuth authentication failed.")
            return redirect(f"{frontend_url}/auth?error={error_msg}")

    @staticmethod
    def logout():
        """GET /api/auth/logout — Clears session."""
        session.clear()
        return jsonify({'success': True, 'message': 'Logged out successfully.'}), 200

    @staticmethod
    @jwt_required()
    def get_me():
        """GET /api/auth/me — Returns authenticated user profile."""
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id)) if current_user_id else None

        if not user:
            return jsonify({'success': False, 'message': 'User profile not found.'}), 404

        return jsonify({
            'success': True,
            'user': user.to_dict()
        }), 200
