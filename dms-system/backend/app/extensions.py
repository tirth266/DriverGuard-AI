from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO
import eventlet

eventlet.monkey_patch()

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()
socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_interval=25,
    ping_timeout=20,
    logger=True,
    engineio_logger=True
)

def init_extensions(app):
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}}, supports_credentials=True)
    socketio.init_app(app, cors_allowed_origins=app.config['CORS_ORIGINS'])