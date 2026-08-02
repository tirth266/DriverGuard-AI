from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models import Alert, DetectionHistory, Trip, User
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

status_bp = Blueprint('status', __name__, url_prefix='/api/status')

@status_bp.route('/', methods=['GET'])
@jwt_required()
def get_status():
    user_id = get_jwt_identity()
    
    active_trip = Trip.query.filter_by(user_id=user_id, end_time=None).first()
    
    recent_alerts = Alert.query.filter_by(user_id=user_id).order_by(
        Alert.created_at.desc()
    ).limit(10).all()
    
    recent_detections = DetectionHistory.query.join(Trip).filter(
        Trip.user_id == user_id
    ).order_by(DetectionHistory.timestamp.desc()).limit(1).all()
    
    current_detection = recent_detections[0] if recent_detections else None
    
    return jsonify({
        'active_trip': active_trip.to_dict() if active_trip else None,
        'current_detection': current_detection.to_dict() if current_detection else None,
        'recent_alerts': [a.to_dict() for a in recent_alerts],
        'user_id': user_id
    }), 200

@status_bp.route('/safety_score', methods=['GET'])
@jwt_required()
def get_safety_score():
    user_id = get_jwt_identity()
    
    active_trip = Trip.query.filter_by(user_id=user_id, end_time=None).first()
    
    if not active_trip:
        return jsonify({'safety_score': 100.0, 'trip': None}), 200
    
    return jsonify({
        'safety_score': active_trip.safety_score,
        'trip': active_trip.to_dict()
    }), 200

alerts_bp = Blueprint('alerts', __name__, url_prefix='/api/alerts')

@alerts_bp.route('/', methods=['GET'])
@jwt_required()
def get_alerts():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    severity = request.args.get('severity')
    alert_type = request.args.get('type')
    unacknowledged_only = request.args.get('unacknowledged', 'false').lower() == 'true'
    trip_id = request.args.get('trip_id', type=int)
    
    query = Alert.query.filter_by(user_id=user_id)
    
    if severity:
        query = query.filter_by(severity=severity)
    if alert_type:
        query = query.filter_by(type=alert_type)
    if unacknowledged_only:
        query = query.filter_by(acknowledged=False)
    if trip_id:
        query = query.filter_by(trip_id=trip_id)
    
    alerts = query.order_by(Alert.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'alerts': [a.to_dict() for a in alerts.items],
        'total': alerts.total,
        'pages': alerts.pages,
        'current_page': page
    }), 200

@alerts_bp.route('/<int:alert_id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_alert(alert_id):
    user_id = get_jwt_identity()
    
    alert = Alert.query.filter_by(id=alert_id, user_id=user_id).first()
    if not alert:
        return jsonify({'error': 'Alert not found'}), 404
    
    alert.acknowledged = True
    alert.acknowledged_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'message': 'Alert acknowledged', 'alert': alert.to_dict()}), 200

@alerts_bp.route('/unacknowledged_count', methods=['GET'])
@jwt_required()
def get_unacknowledged_count():
    user_id = get_jwt_identity()
    
    count = Alert.query.filter_by(user_id=user_id, acknowledged=False).count()
    
    return jsonify({'count': count}), 200

@alerts_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_alert_summary():
    user_id = get_jwt_identity()
    
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(weeks=1)
    month_ago = now - timedelta(days=30)
    
    summary = {
        'last_24_hours': {},
        'last_7_days': {},
        'last_30_days': {},
        'total_unacknowledged': 0
    }
    
    for period_name, start_time in [
        ('last_24_hours', day_ago),
        ('last_7_days', week_ago),
        ('last_30_days', month_ago)
    ]:
        alerts = Alert.query.filter(
            Alert.user_id == user_id,
            Alert.created_at >= start_time
        ).all()
        
        summary[period_name] = {
            'total': len(alerts),
            'by_severity': {
                'info': len([a for a in alerts if a.severity.value == 'info']),
                'warning': len([a for a in alerts if a.severity.value == 'warning']),
                'critical': len([a for a in alerts if a.severity.value == 'critical'])
            },
            'by_type': {}
        }
        
        for alert in alerts:
            alert_type = alert.type.value
            if alert_type not in summary[period_name]['by_type']:
                summary[period_name]['by_type'][alert_type] = 0
            summary[period_name]['by_type'][alert_type] += 1
    
    summary['total_unacknowledged'] = Alert.query.filter_by(
        user_id=user_id, acknowledged=False
    ).count()
    
    return jsonify(summary), 200