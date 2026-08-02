import cv2
import numpy as np
import mediapipe as mp
from typing import Tuple, List, Optional, Dict, Any
import time
import math

mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

class FaceDetector:
    def __init__(self, config):
        self.config = config
        self.face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        self.LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
        self.RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
        self.MOUTH_INDICES = [61, 81, 311, 291, 402, 178]
        
        self.LEFT_EYE_IRIS = [474, 475, 476, 477]
        self.RIGHT_EYE_IRIS = [469, 470, 471, 472]
        
        self.FACE_OVAL = [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
        ]

    def process_frame(self, frame: np.ndarray) -> Dict[str, Any]:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb_frame.flags.writeable = False
        results = self.face_mesh.process(rgb_frame)
        rgb_frame.flags.writeable = True
        
        result = {
            'face_detected': False,
            'landmarks': None,
            'face_bbox': None,
            'frame_shape': frame.shape[:2]
        }
        
        if results.multi_face_landmarks:
            face_landmarks = results.multi_face_landmarks[0]
            result['face_detected'] = True
            result['landmarks'] = face_landmarks
            result['face_bbox'] = self._get_face_bbox(face_landmarks, frame.shape[:2])
            
        return result

    def _get_face_bbox(self, landmarks, frame_shape) -> Tuple[int, int, int, int]:
        h, w = frame_shape
        x_coords = [lm.x * w for lm in landmarks.landmark]
        y_coords = [lm.y * h for lm in landmarks.landmark]
        x_min, x_max = int(min(x_coords)), int(max(x_coords))
        y_min, y_max = int(min(y_coords)), int(max(y_coords))
        padding = 20
        x_min = max(0, x_min - padding)
        y_min = max(0, y_min - padding)
        x_max = min(w, x_max + padding)
        y_max = min(h, y_max + padding)
        return (x_min, y_min, x_max - x_min, y_max - y_min)

    def calculate_ear(self, landmarks, eye_indices) -> float:
        points = []
        for idx in eye_indices:
            lm = landmarks.landmark[idx]
            points.append([lm.x, lm.y])
        points = np.array(points)
        
        vertical_1 = np.linalg.norm(points[1] - points[5])
        vertical_2 = np.linalg.norm(points[2] - points[4])
        horizontal = np.linalg.norm(points[0] - points[3])
        
        if horizontal == 0:
            return 0.0
        ear = (vertical_1 + vertical_2) / (2.0 * horizontal)
        return ear

    def calculate_mar(self, landmarks) -> float:
        points = []
        for idx in self.MOUTH_INDICES:
            lm = landmarks.landmark[idx]
            points.append([lm.x, lm.y])
        points = np.array(points)
        
        vertical_1 = np.linalg.norm(points[1] - points[5])
        vertical_2 = np.linalg.norm(points[2] - points[4])
        horizontal = np.linalg.norm(points[0] - points[3])
        
        if horizontal == 0:
            return 0.0
        mar = (vertical_1 + vertical_2) / (2.0 * horizontal)
        return mar

    def calculate_head_pose(self, landmarks, frame_shape) -> Tuple[float, float, float]:
        h, w = frame_shape[:2]
        
        model_points = np.array([
            (0.0, 0.0, 0.0),
            (0.0, -330.0, -65.0),
            (-225.0, 170.0, -135.0),
            (225.0, 170.0, -135.0),
            (-150.0, -150.0, -125.0),
            (150.0, -150.0, -125.0)
        ], dtype=np.float64)
        
        image_points = np.array([
            (landmarks.landmark[1].x * w, landmarks.landmark[1].y * h),
            (landmarks.landmark[152].x * w, landmarks.landmark[152].y * h),
            (landmarks.landmark[263].x * w, landmarks.landmark[263].y * h),
            (landmarks.landmark[33].x * w, landmarks.landmark[33].y * h),
            (landmarks.landmark[287].x * w, landmarks.landmark[287].y * h),
            (landmarks.landmark[57].x * w, landmarks.landmark[57].y * h)
        ], dtype=np.float64)
        
        focal_length = w
        center = (w / 2, h / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)
        
        dist_coeffs = np.zeros((4, 1))
        
        success, rotation_vector, translation_vector = cv2.solvePnP(
            model_points, image_points, camera_matrix, dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )
        
        if not success:
            return 0.0, 0.0, 0.0
        
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        pose_mat = cv2.hconcat((rotation_matrix, translation_vector))
        _, _, _, _, _, _, euler_angles = cv2.decomposeProjectionMatrix(pose_mat)
        
        pitch, yaw, roll = euler_angles.flatten()[:3]
        
        pitch = pitch - 180 if pitch > 180 else pitch
        yaw = yaw - 180 if yaw > 180 else yaw
        roll = roll - 180 if roll > 180 else roll
        
        return float(pitch), float(yaw), float(roll)

    def get_iris_center(self, landmarks, iris_indices, frame_shape) -> Tuple[float, float]:
        h, w = frame_shape[:2]
        x_coords = [landmarks.landmark[idx].x * w for idx in iris_indices]
        y_coords = [landmarks.landmark[idx].y * h for idx in iris_indices]
        return (sum(x_coords) / len(x_coords), sum(y_coords) / len(y_coords))

    def is_eyes_on_road(self, landmarks, frame_shape) -> Tuple[bool, float]:
        left_iris = self.get_iris_center(landmarks, self.LEFT_EYE_IRIS, frame_shape)
        right_iris = self.get_iris_center(landmarks, self.RIGHT_EYE_IRIS, frame_shape)
        
        left_eye_center = np.array([
            (landmarks.landmark[33].x + landmarks.landmark[133].x) / 2 * frame_shape[1],
            (landmarks.landmark[33].y + landmarks.landmark[133].y) / 2 * frame_shape[0]
        ])
        right_eye_center = np.array([
            (landmarks.landmark[362].x + landmarks.landmark[263].x) / 2 * frame_shape[1],
            (landmarks.landmark[362].y + landmarks.landmark[263].y) / 2 * frame_shape[0]
        ])
        
        left_offset = np.linalg.norm(np.array(left_iris) - left_eye_center)
        right_offset = np.linalg.norm(np.array(right_iris) - right_eye_center)
        avg_offset = (left_offset + right_offset) / 2
        
        eye_width = abs(landmarks.landmark[33].x - landmarks.landmark[133].x) * frame_shape[1]
        threshold = eye_width * 0.3
        
        return avg_offset < threshold, float(avg_offset)

    def calculate_brightness(self, frame: np.ndarray) -> float:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        return float(np.mean(gray))

    def draw_landmarks(self, frame: np.ndarray, landmarks, color=(0, 255, 0)) -> np.ndarray:
        annotated_frame = frame.copy()
        
        h, w = frame.shape[:2]
        
        for idx in self.LEFT_EYE_INDICES + self.RIGHT_EYE_INDICES + self.MOUTH_INDICES:
            lm = landmarks.landmark[idx]
            x, y = int(lm.x * w), int(lm.y * h)
            cv2.circle(annotated_frame, (x, y), 2, color, -1)
        
        for idx in self.LEFT_EYE_IRIS + self.RIGHT_EYE_IRIS:
            lm = landmarks.landmark[idx]
            x, y = int(lm.x * w), int(lm.y * h)
            cv2.circle(annotated_frame, (x, y), 3, (255, 0, 0), -1)
        
        for idx in self.FACE_OVAL:
            lm = landmarks.landmark[idx]
            x, y = int(lm.x * w), int(lm.y * h)
            cv2.circle(annotated_frame, (x, y), 1, (0, 255, 255), -1)
        
        return annotated_frame

    def draw_bbox(self, frame: np.ndarray, bbox: Tuple[int, int, int, int], color=(0, 255, 0), thickness=2) -> np.ndarray:
        x, y, w, h = bbox
        cv2.rectangle(frame, (x, y), (x + w, y + h), color, thickness)
        return frame

    def draw_text(self, frame: np.ndarray, text: str, position: Tuple[int, int], 
                  color=(255, 255, 255), font_scale=0.6, thickness=2, background=True) -> np.ndarray:
        if background:
            (text_width, text_height), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
            x, y = position
            cv2.rectangle(frame, (x - 5, y - text_height - 5), (x + text_width + 5, y + 5), (0, 0, 0), -1)
        cv2.putText(frame, text, position, cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, thickness, cv2.LINE_AA)
        return frame

    def close(self):
        self.face_mesh.close()