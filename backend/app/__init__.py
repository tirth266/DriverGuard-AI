import os
from flask import Flask, jsonify
from app.config import get_config
from app.extensions import db, jwt, cors
from app.auth import auth_bp
from app.camera.routes import camera_bp
from app.auth.controller import init_oauth

def create_app(config_class=None):
    """Application factory for Flask app."""
    app = Flask(__name__)

    # Load configuration
    if config_class is None:
        config_class = get_config()
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    
    # Configure CORS for frontend
    frontend_url = app.config.get('FRONTEND_URL', 'http://localhost:5173')
    allowed_origins = [
        frontend_url,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
    cors.init_app(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

    # Initialize OAuth (Authlib)
    init_oauth(app)

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(camera_bp)

    # Root endpoint - health check for API
    @app.route('/', methods=['GET'])
    def root():
        return jsonify({
            'status': 'success',
            'message': 'Backend is running',
            'service': 'DriverGuard AI Python Flask API',
            'environment': app.config.get('FLASK_ENV', 'development')
        }), 200

    # Favicon handler
    @app.route('/favicon.ico', methods=['GET'])
    def favicon():
        return '', 204

    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'online',
            'service': 'DriverGuard AI Python Flask API',
            'environment': app.config.get('FLASK_ENV', 'development')
        }), 200

    # Auto-create tables in development mode
    with app.app_context():
        db.create_all()

    return app
