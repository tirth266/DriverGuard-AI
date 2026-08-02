from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models import Trip, DetectionHistory, Alert, CameraSettings
from app.config import Config
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

video_bp = Blueprint('video', __name__, url_prefix='/api/video')

@video_bp.route('/stream', methods=['GET'])
@jwt_required()
def get_stream_info():
    user_id = get_jwt_identity()
    return jsonify({
        'websocket_url': request.host_url.replace('http', 'ws') + 'socket.io',
        'config': {
            'width': current_app.config['CAMERA_WIDTH'],
            'height': current_app.config['CAMERA_HEIGHT'],
            'fps': current_app.config['CAMERA_FPS'],
            'mirror': current_app.config['CAMERA_MIRROR']
        }
    }), 200

@video_bp.route('/frame', methods=['POST'])
@jwt_required()
def process_frame():
    return jsonify({'message': 'Use WebSocket for real-time frame processing'}), 200

@video_bp.route('/start_trip', methods=['POST'])
@jwt_required()
def start_trip():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    active_trip = Trip.query.filter_by(user_id=user_id, end_time=None).first()
    if active_trip:
        return jsonify({'error': 'Active trip already exists', 'trip': active_trip.to_dict()}), 400
    
    trip = Trip(
        user_id=user_id,
        start_location=data.get('start_location'),
        start_time=datetime.utcnow()
    )
    
    db.session.add(trip)
    db.session.commit()
    
    return jsonify({'message': 'Trip started', 'trip': trip.to_dict()}), 201

@video_bp.route('/end_trip', methods=['POST'])
@jwt_required()
def end_trip():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    trip = Trip.query.filter_by(user_id=user_id, end_time=None).first()
    if not trip:
        return jsonify({'error': 'No active trip found'}), 404
    
    trip.end_time = datetime.utcnow()
    trip.end_location = data.get('end_location')
    trip.duration_seconds = int((trip.end_time - trip.start_time).total_seconds())
    trip.distance_km = data.get('distance_km', 0.0)
    
    db.session.commit()
    
    return jsonify({'message': 'Trip ended', 'trip': trip.to_dict()}), 200

@video_bp.route('/current_trip', methods=['GET'])
@jwt_required()
def get_current_trip():
    user_id = get_jwt_identity()
    
    trip = Trip.query.filter_by(user_id=user_id, end_time=None).first()
    if not trip:
        return jsonify({'trip': None}), 200
    
    return jsonify({'trip': trip.to_dict()}), 200

@video_bp.route('/trips', methods=['GET'])
@jwt_required()
def get_trips():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    trips = Trip.query.filter_by(user_id=user_id).order_by(Trip.start_time.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'trips': [t.to_dict() for t in trips.items],
        'total': trips.total,
        'pages': trips.pages,
        'current_page': page
    }), 200

@video_bp.route('/trips/<int:trip_id>', methods=['GET'])
@jwt_required()
def get_trip(trip_id):
    user_id = get_jwt_identity()
    
    trip = Trip.query.filter_by(id=trip_id, user_id=user_id).first()
    if not trip:
        return jsonify({'error': 'Trip not found'}), 404
    
    detections = DetectionHistory.query.filter_by(trip_id=trip_id).order_by(DetectionHistory.timestamp).all()
    alerts = Alert.query.filter_by(trip_id=trip_id).order_by(Alert.created_at).all()
    
    return jsonify({
        'trip': trip.to_dict(),
        'detections': [d.to_dict() for d in detections],
        'alerts': [a.to_dict() for a in alerts]
    }), 200

@video_bp.route('/detections/<int:trip_id>', methods=['GET'])
@jwt_required()
def get_detections(trip_id):
    user_id = get_jwt_identity()
    
    trip = Trip.query.filter_by(id=trip_id, user_id=user_id).first()
    if not trip:
        return jsonify({'error': 'Trip not found'}), 404
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 100, type=int)
    
    detections = DetectionHistory.query.filter_by(trip_id=trip_id).order_by(
        DetectionHistory.timestamp.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'detections': [d.to_dict() for d in detections.items],
        'total': detections.total,
        'pages': detections.pages,
        'current_page': page
    }), 200

@video_bp.route('/camera_settings', methods=['GET'])
@jwt_required()
def get_camera_settings():
    user_id = get_jwt_identity()
    
    settings = CameraSettings.query.filter_by(user_id=user_id).first()
    if not settings:
        settings = CameraSettings(user_id=user_id)
        db.session.add(settings)
        db.session.commit()
    
    return jsonify({'settings': settings.to_dict()}), 200

@video_bp.route('/camera_settings', methods=['PUT'])
@jwt_required()
def update_camera_settings():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    settings = CameraSettings.query.filter_by(user_id=user_id).first()
    if not settings:
        settings = CameraSettings(user_id=user_id)
        db.session.add(settings)
    
    settings.camera_id = data.get('camera_id', settings.camera_id)
    settings.width = data.get('width', settings.width)
    settings.height = data.get('height', settings.height)
    settings.fps = data.get('fps', settings.fps)
    settings.mirror = data.get('mirror', settings.mirror)
    settings.auto_start = data.get('auto_start', settings.auto_start)
    settings.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({'message': 'Settings updated', 'settings': settings.to_dict()}), 200