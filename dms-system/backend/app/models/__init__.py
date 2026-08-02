from app.extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import enum

class UserRole(enum.Enum):
    ADMIN = 'admin'
    DRIVER = 'driver'
    MANAGER = 'manager'

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(64), nullable=False)
    last_name = db.Column(db.String(64), nullable=False)
    role = db.Column(db.Enum(UserRole), default=UserRole.DRIVER, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    google_id = db.Column(db.String(128), unique=True, nullable=True)
    avatar_url = db.Column(db.String(512), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)

    trips = db.relationship('Trip', backref='driver', lazy='dynamic')
    alerts = db.relationship('Alert', backref='driver', lazy='dynamic')
    login_history = db.relationship('LoginHistory', backref='user', lazy='dynamic')
    camera_settings = db.relationship('CameraSettings', backref='user', lazy='dynamic', uselist=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'role': self.role.value,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'avatar_url': self.avatar_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }
        if include_sensitive:
            data['google_id'] = self.google_id
        return data

    def __repr__(self):
        return f'<User {self.email}>'

class Trip(db.Model):
    __tablename__ = 'trips'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    start_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    start_location = db.Column(db.String(256), nullable=True)
    end_location = db.Column(db.String(256), nullable=True)
    distance_km = db.Column(db.Float, default=0.0)
    duration_seconds = db.Column(db.Integer, default=0)
    safety_score = db.Column(db.Float, default=100.0)
    total_blinks = db.Column(db.Integer, default=0)
    total_yawns = db.Column(db.Integer, default=0)
    drowsiness_events = db.Column(db.Integer, default=0)
    eyes_off_road_events = db.Column(db.Integer, default=0)
    phone_usage_events = db.Column(db.Integer, default=0)
    smoking_events = db.Column(db.Integer, default=0)
    seat_belt_violations = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    detection_history = db.relationship('DetectionHistory', backref='trip', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'start_location': self.start_location,
            'end_location': self.end_location,
            'distance_km': self.distance_km,
            'duration_seconds': self.duration_seconds,
            'safety_score': self.safety_score,
            'total_blinks': self.total_blinks,
            'total_yawns': self.total_yawns,
            'drowsiness_events': self.drowsiness_events,
            'eyes_off_road_events': self.eyes_off_road_events,
            'phone_usage_events': self.phone_usage_events,
            'smoking_events': self.smoking_events,
            'seat_belt_violations': self.seat_belt_violations,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Trip {self.id} - User {self.user_id}>'

class Alert(db.Model):
    __tablename__ = 'alerts'

    class Severity(enum.Enum):
        INFO = 'info'
        WARNING = 'warning'
        CRITICAL = 'critical'

    class Type(enum.Enum):
        DROWSINESS = 'drowsiness'
        EYES_CLOSED = 'eyes_closed'
        EYES_OFF_ROAD = 'eyes_off_road'
        PHONE_USAGE = 'phone_usage'
        SMOKING = 'smoking'
        SEAT_BELT_MISSING = 'seat_belt_missing'
        FACE_MISSING = 'face_missing'
        LOW_LIGHT = 'low_light'
        CAMERA_BLOCKED = 'camera_blocked'
        YAWNING = 'yawning'
        HEAD_POSE = 'head_pose'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=True, index=True)
    type = db.Column(db.Enum(Type), nullable=False)
    severity = db.Column(db.Enum(Severity), default=Severity.WARNING, nullable=False)
    message = db.Column(db.String(512), nullable=False)
    confidence = db.Column(db.Float, default=0.0)
    metadata = db.Column(db.JSON, nullable=True)
    acknowledged = db.Column(db.Boolean, default=False, nullable=False)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'trip_id': self.trip_id,
            'type': self.type.value,
            'severity': self.severity.value,
            'message': self.message,
            'confidence': self.confidence,
            'metadata': self.metadata,
            'acknowledged': self.acknowledged,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Alert {self.type.value} - {self.severity.value}>'

class DetectionHistory(db.Model):
    __tablename__ = 'detection_history'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False, index=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    ear_left = db.Column(db.Float, nullable=True)
    ear_right = db.Column(db.Float, nullable=True)
    ear_avg = db.Column(db.Float, nullable=True)
    mar = db.Column(db.Float, nullable=True)
    head_pitch = db.Column(db.Float, nullable=True)
    head_yaw = db.Column(db.Float, nullable=True)
    head_roll = db.Column(db.Float, nullable=True)
    blink_detected = db.Column(db.Boolean, default=False)
    yawn_detected = db.Column(db.Boolean, default=False)
    drowsiness_detected = db.Column(db.Boolean, default=False)
    eyes_on_road = db.Column(db.Boolean, default=True)
    face_detected = db.Column(db.Boolean, default=True)
    phone_detected = db.Column(db.Boolean, default=False)
    smoking_detected = db.Column(db.Boolean, default=False)
    seat_belt_detected = db.Column(db.Boolean, default=True)
    brightness = db.Column(db.Float, nullable=True)
    fps = db.Column(db.Float, nullable=True)
    confidence_score = db.Column(db.Float, default=0.0)

    def to_dict(self):
        return {
            'id': self.id,
            'trip_id': self.trip_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'ear_left': self.ear_left,
            'ear_right': self.ear_right,
            'ear_avg': self.ear_avg,
            'mar': self.mar,
            'head_pitch': self.head_pitch,
            'head_yaw': self.head_yaw,
            'head_roll': self.head_roll,
            'blink_detected': self.blink_detected,
            'yawn_detected': self.yawn_detected,
            'drowsiness_detected': self.drowsiness_detected,
            'eyes_on_road': self.eyes_on_road,
            'face_detected': self.face_detected,
            'phone_detected': self.phone_detected,
            'smoking_detected': self.smoking_detected,
            'seat_belt_detected': self.seat_belt_detected,
            'brightness': self.brightness,
            'fps': self.fps,
            'confidence_score': self.confidence_score,
        }

    def __repr__(self):
        return f'<DetectionHistory {self.id} - Trip {self.trip_id}>'

class LoginHistory(db.Model):
    __tablename__ = 'login_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(512), nullable=True)
    login_method = db.Column(db.String(32), default='email')
    success = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'login_method': self.login_method,
            'success': self.success,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<LoginHistory {self.id} - User {self.user_id}>'

class CameraSettings(db.Model):
    __tablename__ = 'camera_settings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    camera_id = db.Column(db.String(128), nullable=True)
    width = db.Column(db.Integer, default=1280)
    height = db.Column(db.Integer, default=720)
    fps = db.Column(db.Integer, default=30)
    mirror = db.Column(db.Boolean, default=True)
    auto_start = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'camera_id': self.camera_id,
            'width': self.width,
            'height': self.height,
            'fps': self.fps,
            'mirror': self.mirror,
            'auto_start': self.auto_start,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<CameraSettings {self.id} - User {self.user_id}>'