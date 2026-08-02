from flask import Flask, jsonify
from app.config import config
from app.extensions import init_extensions, db
from app.routes.auth import auth_bp
from app.routes.video import video_bp
from app.routes.status import status_bp, alerts_bp
from app.socket.handlers import init_socketio
from app.models import User, Trip, Alert, DetectionHistory, LoginHistory, CameraSettings
import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    init_extensions(app)
    init_socketio(app)
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(video_bp)
    app.register_blueprint(status_bp)
    app.register_blueprint(alerts_bp)
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'service': 'DMS Backend'}), 200
    
    @app.route('/api/info', methods=['GET'])
    def api_info():
        return jsonify({
            'name': 'Driver Monitoring System API',
            'version': '1.0.0',
            'description': 'Real-time AI Driver Monitoring System'
        }), 200
    
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500
    
    @app.shell_context_processor
    def make_shell_context():
        return {
            'db': db,
            'User': User,
            'Trip': Trip,
            'Alert': Alert,
            'DetectionHistory': DetectionHistory,
            'LoginHistory': LoginHistory,
            'CameraSettings': CameraSettings
        }
    
    with app.app_context():
        db.create_all()
        
        admin = User.query.filter_by(email='admin@dms.com').first()
        if not admin:
            admin = User(
                email='admin@dms.com',
                first_name='Admin',
                last_name='User',
                role=User.__table__.c.role.type.enum_class.ADMIN
            )
            admin.set_password('admin123')
            admin.is_verified = True
            db.session.add(admin)
            db.session.commit()
            logging.info("Created default admin user")
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)