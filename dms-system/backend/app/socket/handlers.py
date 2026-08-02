from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
from app.extensions import socketio
from app.services.ai.detection_service import DetectionService
from app.config import Config
import base64
import cv2
import numpy as np
import logging
import time
from threading import Lock

logger = logging.getLogger(__name__)

class CameraStreamManager:
    def __init__(self, config: Config):
        self.config = config
        self.detection_service = DetectionService(config)
        self.active_streams = {}
        self.stream_lock = Lock()
        
    def start_stream(self, user_id: int, sid: str):
        with self.stream_lock:
            self.active_streams[sid] = {
                'user_id': user_id,
                'start_time': time.time(),
                'frame_count': 0,
                'last_frame_time': 0
            }
            logger.info(f"Stream started for user {user_id}, session {sid}")
    
    def stop_stream(self, sid: str):
        with self.stream_lock:
            if sid in self.active_streams:
                user_id = self.active_streams[sid]['user_id']
                del self.active_streams[sid]
                logger.info(f"Stream stopped for user {user_id}, session {sid}")
    
    def process_frame(self, sid: str, frame_data: str) -> dict:
        with self.stream_lock:
            if sid not in self.active_streams:
                return {'error': 'Stream not active'}
            
            stream_info = self.active_streams[sid]
            stream_info['frame_count'] += 1
            stream_info['last_frame_time'] = time.time()
            
            try:
                frame = self._decode_frame(frame_data)
                if frame is None:
                    return {'error': 'Invalid frame data'}
                
                result = self.detection_service.process_frame(frame)
                
                encoded_frame = self._encode_frame(result['frame'])
                
                return {
                    'frame': encoded_frame,
                    'detections': result['detections'],
                    'stats': self.detection_service.get_statistics()
                }
            except Exception as e:
                logger.error(f"Frame processing error: {e}")
                return {'error': str(e)}
    
    def _decode_frame(self, frame_data: str) -> np.ndarray:
        try:
            if ',' in frame_data:
                frame_data = frame_data.split(',')[1]
            frame_bytes = base64.b64decode(frame_data)
            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return frame
        except Exception as e:
            logger.error(f"Frame decode error: {e}")
            return None
    
    def _encode_frame(self, frame: np.ndarray) -> str:
        try:
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 80]
            _, buffer = cv2.imencode('.jpg', frame, encode_param)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            return f"data:image/jpeg;base64,{frame_base64}"
        except Exception as e:
            logger.error(f"Frame encode error: {e}")
            return ""
    
    def get_stream_info(self, sid: str) -> dict:
        with self.stream_lock:
            return self.active_streams.get(sid, {})
    
    def reset_counters(self, sid: str):
        with self.stream_lock:
            if sid in self.active_streams:
                self.detection_service.reset_counters()

stream_manager = None

def init_socketio(app):
    global stream_manager
    stream_manager = CameraStreamManager(app.config)
    return socketio

@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")
    emit('connected', {'sid': request.sid, 'message': 'Connected to DMS WebSocket'})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")
    stream_manager.stop_stream(request.sid)

@socketio.on('start_stream')
def handle_start_stream(data):
    user_id = data.get('user_id')
    if not user_id:
        emit('error', {'message': 'User ID required'})
        return
    
    stream_manager.start_stream(user_id, request.sid)
    join_room(f"user_{user_id}")
    emit('stream_started', {'message': 'Camera stream started', 'sid': request.sid})

@socketio.on('stop_stream')
def handle_stop_stream():
    stream_manager.stop_stream(request.sid)
    emit('stream_stopped', {'message': 'Camera stream stopped'})

@socketio.on('frame')
def handle_frame(data):
    frame_data = data.get('frame')
    if not frame_data:
        emit('error', {'message': 'Frame data required'})
        return
    
    result = stream_manager.process_frame(request.sid, frame_data)
    
    if 'error' in result:
        emit('error', result)
        return
    
    emit('detection_result', result)

@socketio.on('reset_counters')
def handle_reset_counters():
    stream_manager.reset_counters(request.sid)
    emit('counters_reset', {'message': 'Counters reset'})

@socketio.on('get_stats')
def handle_get_stats():
    stats = stream_manager.detection_service.get_statistics()
    emit('stats', stats)

@socketio.on('ping')
def handle_ping():
    emit('pong', {'timestamp': time.time()})