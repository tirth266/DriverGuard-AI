from app.services.opencv.face_detector import FaceDetector
from app.config import Config
from typing import Dict, Any, List, Optional
import time
import threading
from collections import deque
import logging

logger = logging.getLogger(__name__)

class DetectionService:
    def __init__(self, config: Config):
        self.config = config
        self.face_detector = FaceDetector(config)
        self.frame_buffer = deque(maxlen=30)
        self.detection_history = deque(maxlen=100)
        self.lock = threading.Lock()
        
        self.blink_counter = 0
        self.yawn_counter = 0
        self.drowsiness_counter = 0
        self.eyes_closed_counter = 0
        self.face_missing_counter = 0
        self.eyes_off_road_counter = 0
        
        self.prev_ear = 1.0
        self.prev_mar = 0.0
        
        self.last_alert_time = {}
        self.alert_cooldown = config.ALERT_COOLDOWN
        
        self.fps_counter = 0
        self.fps_start_time = time.time()
        self.current_fps = 0.0

    def process_frame(self, frame) -> Dict[str, Any]:
        start_time = time.time()
        
        with self.lock:
            result = self.face_detector.process_frame(frame)
            
            detections = {
                'timestamp': time.time(),
                'face_detected': result['face_detected'],
                'blink_detected': False,
                'yawn_detected': False,
                'drowsiness_detected': False,
                'eyes_closed_detected': False,
                'eyes_on_road': True,
                'phone_detected': False,
                'smoking_detected': False,
                'seat_belt_detected': True,
                'head_pitch': 0.0,
                'head_yaw': 0.0,
                'head_roll': 0.0,
                'ear_left': 0.0,
                'ear_right': 0.0,
                'ear_avg': 0.0,
                'mar': 0.0,
                'brightness': 0.0,
                'fps': self.current_fps,
                'confidence_score': 0.0,
                'alerts': []
            }
            
            if result['face_detected']:
                self.face_missing_counter = 0
                landmarks = result['landmarks']
                frame_shape = result['frame_shape']
                
                detections['ear_left'] = self.face_detector.calculate_ear(landmarks, self.face_detector.LEFT_EYE_INDICES)
                detections['ear_right'] = self.face_detector.calculate_ear(landmarks, self.face_detector.RIGHT_EYE_INDICES)
                detections['ear_avg'] = (detections['ear_left'] + detections['ear_right']) / 2
                detections['mar'] = self.face_detector.calculate_mar(landmarks)
                
                pitch, yaw, roll = self.face_detector.calculate_head_pose(landmarks, frame_shape)
                detections['head_pitch'] = pitch
                detections['head_yaw'] = yaw
                detections['head_roll'] = roll
                
                eyes_on_road, offset = self.face_detector.is_eyes_on_road(landmarks, frame_shape)
                detections['eyes_on_road'] = eyes_on_road
                
                detections['brightness'] = self.face_detector.calculate_brightness(frame)
                
                detections['confidence_score'] = self._calculate_confidence(detections)
                
                self._update_counters(detections)
                detections = self._check_detections(detections)
                
                annotated_frame = self.face_detector.draw_landmarks(frame, landmarks)
                annotated_frame = self.face_detector.draw_bbox(annotated_frame, result['face_bbox'])
                annotated_frame = self._draw_detection_info(annotated_frame, detections)
                result['annotated_frame'] = annotated_frame
            else:
                self.face_missing_counter += 1
                if self.face_missing_counter >= self.config.FACE_MISSING_THRESHOLD:
                    detections['alerts'].append(self._create_alert('FACE_MISSING', 'critical', 'Driver face not detected!'))
            
            self._update_fps()
            detections['fps'] = self.current_fps
            detections['blink_counter'] = self.blink_counter
            detections['yawn_counter'] = self.yawn_counter
            
            self.detection_history.append(detections)
            self.frame_buffer.append({
                'frame': result.get('annotated_frame', frame),
                'detections': detections,
                'timestamp': time.time()
            })
            
            processing_time = time.time() - start_time
            detections['processing_time_ms'] = processing_time * 1000
            
            return {
                'frame': result.get('annotated_frame', frame),
                'detections': detections
            }

    def _update_counters(self, detections: Dict[str, Any]):
        ear = detections['ear_avg']
        mar = detections['mar']
        
        if self.prev_ear > self.config.EAR_THRESHOLD and ear <= self.config.EAR_THRESHOLD:
            self.blink_counter += 1
            detections['blink_detected'] = True
        self.prev_ear = ear
        
        if self.prev_mar <= self.config.MAR_THRESHOLD and mar > self.config.MAR_THRESHOLD:
            self.yawn_counter += 1
            detections['yawn_detected'] = True
        self.prev_mar = mar
        
        if ear < self.config.DROWSINESS_EAR_THRESHOLD:
            self.drowsiness_counter += 1
        else:
            self.drowsiness_counter = 0
        
        if ear < self.config.EYES_CLOSED_THRESHOLD:
            self.eyes_closed_counter += 1
        else:
            self.eyes_closed_counter = 0
        
        if not detections['eyes_on_road']:
            self.eyes_off_road_counter += 1
        else:
            self.eyes_off_road_counter = 0

    def _check_detections(self, detections: Dict[str, Any]) -> Dict[str, Any]:
        ear = detections['ear_avg']
        
        if self.drowsiness_counter >= self.config.DROWSINESS_CONSECUTIVE_FRAMES:
            detections['drowsiness_detected'] = True
            detections['alerts'].append(self._create_alert('DROWSINESS', 'critical', 'Drowsiness detected! Please take a break.'))
        
        if self.eyes_closed_counter >= self.config.EYES_CLOSED_CONSECUTIVE_FRAMES:
            detections['eyes_closed_detected'] = True
            detections['alerts'].append(self._create_alert('EYES_CLOSED', 'critical', 'Eyes closed for too long!'))
        
        if self.eyes_off_road_counter >= self.config.HEAD_POSE_THRESHOLD:
            detections['alerts'].append(self._create_alert('EYES_OFF_ROAD', 'warning', 'Eyes off road!'))
        
        if abs(detections['head_yaw']) > self.config.HEAD_POSE_THRESHOLD:
            detections['alerts'].append(self._create_alert('HEAD_POSE', 'warning', 'Head turned away from road!'))
        
        if detections['brightness'] < self.config.BRIGHTNESS_THRESHOLD:
            detections['alerts'].append(self._create_alert('LOW_LIGHT', 'warning', 'Low light conditions detected'))
        
        return detections

    def _create_alert(self, alert_type: str, severity: str, message: str) -> Dict[str, Any]:
        current_time = time.time()
        if alert_type in self.last_alert_time:
            if current_time - self.last_alert_time[alert_type] < self.alert_cooldown:
                return None
        self.last_alert_time[alert_type] = current_time
        
        return {
            'type': alert_type.lower(),
            'severity': severity,
            'message': message,
            'timestamp': current_time,
            'confidence': 0.9
        }

    def _calculate_confidence(self, detections: Dict[str, Any]) -> float:
        confidence = 1.0
        if not detections['face_detected']:
            confidence *= 0.1
        if detections['brightness'] < 50:
            confidence *= 0.7
        return confidence

    def _update_fps(self):
        self.fps_counter += 1
        elapsed = time.time() - self.fps_start_time
        if elapsed >= 1.0:
            self.current_fps = self.fps_counter / elapsed
            self.fps_counter = 0
            self.fps_start_time = time.time()

    def _draw_detection_info(self, frame, detections: Dict[str, Any]):
        h, w = frame.shape[:2]
        
        info_lines = [
            f"FPS: {detections['fps']:.1f}",
            f"EAR: {detections['ear_avg']:.3f}",
            f"MAR: {detections['mar']:.3f}",
            f"Blinks: {detections['blink_counter']}",
            f"Yawns: {detections['yawn_counter']}",
            f"Head: P={detections['head_pitch']:.1f} Y={detections['head_yaw']:.1f} R={detections['head_roll']:.1f}",
            f"Eyes on Road: {'Yes' if detections['eyes_on_road'] else 'No'}",
            f"Brightness: {detections['brightness']:.1f}",
        ]
        
        y_offset = 30
        for i, line in enumerate(info_lines):
            color = (0, 255, 0) if 'Yes' in line or 'FPS' in line else (255, 255, 255)
            if 'No' in line or 'Drowsiness' in line or 'Closed' in line:
                color = (0, 0, 255)
            self.face_detector.draw_text(frame, line, (10, y_offset + i * 25), color=color, font_scale=0.5)
        
        alerts = detections.get('alerts', [])
        for i, alert in enumerate(alerts[:3]):
            if alert:
                color = (0, 0, 255) if alert['severity'] == 'critical' else (0, 165, 255)
                self.face_detector.draw_text(
                    frame, f"⚠ {alert['message']}", 
                    (10, h - 80 - i * 30), 
                    color=color, font_scale=0.6
                )
        
        return frame

    def get_statistics(self) -> Dict[str, Any]:
        with self.lock:
            return {
                'blink_counter': self.blink_counter,
                'yawn_counter': self.yawn_counter,
                'drowsiness_counter': self.drowsiness_counter,
                'eyes_closed_counter': self.eyes_closed_counter,
                'face_missing_counter': self.face_missing_counter,
                'eyes_off_road_counter': self.eyes_off_road_counter,
                'current_fps': self.current_fps,
                'detection_history_length': len(self.detection_history)
            }

    def reset_counters(self):
        with self.lock:
            self.blink_counter = 0
            self.yawn_counter = 0
            self.drowsiness_counter = 0
            self.eyes_closed_counter = 0
            self.face_missing_counter = 0
            self.eyes_off_road_counter = 0
            self.prev_ear = 1.0
            self.prev_mar = 0.0
            self.last_alert_time = {}

    def close(self):
        self.face_detector.close()