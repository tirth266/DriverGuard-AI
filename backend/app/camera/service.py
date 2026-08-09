"""
Camera service for handling real-time video streaming via WebSocket.
"""
import base64
import json
import logging
import time
import threading
from typing import Optional, Dict, Any
from dataclasses import dataclass, field

from fastapi import WebSocket, WebSocketDisconnect
from jose import jwt, JWTError

from app.extensions import JWT_SECRET_KEY, JWT_ALGORITHM

logger = logging.getLogger(__name__)


@dataclass
class CameraSession:
    """Represents an active camera session for a user."""
    user_id: str
    websocket: Any
    is_active: bool = True
    frame_count: int = 0
    last_frame_time: float = field(default_factory=time.time)
    fps: float = 0.0
    processing_stats: Dict[str, Any] = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def update_fps(self):
        with self._lock:
            now = time.time()
            elapsed = now - self.last_frame_time
            if elapsed > 0:
                self.fps = 1.0 / elapsed
            self.last_frame_time = now
            self.frame_count += 1


class CameraService:
    """Manages active camera sessions and WebSocket connections."""

    def __init__(self):
        self._sessions: Dict[str, CameraSession] = {}
        self._lock = threading.RLock()
        self._frame_processor = None

    def set_frame_processor(self, processor):
        """Set the frame processor instance."""
        self._frame_processor = processor

    def create_session(self, user_id: str, websocket) -> CameraSession:
        """Create a new camera session for a user."""
        with self._lock:
            # Close existing session for this user if any
            if user_id in self._sessions:
                self.close_session(user_id)

            session = CameraSession(user_id=user_id, websocket=websocket)
            self._sessions[user_id] = session
            logger.info(f"Created camera session for user {user_id}")
            return session

    def get_session(self, user_id: str) -> Optional[CameraSession]:
        """Get active session for a user."""
        with self._lock:
            return self._sessions.get(user_id)

    def close_session(self, user_id: str) -> bool:
        """Close a user's camera session."""
        with self._lock:
            if user_id in self._sessions:
                session = self._sessions[user_id]
                session.is_active = False
                del self._sessions[user_id]
                logger.info(f"Closed camera session for user {user_id}")
                return True
            return False

    def get_active_sessions(self) -> Dict[str, CameraSession]:
        """Get all active sessions."""
        with self._lock:
            return {k: v for k, v in self._sessions.items() if v.is_active}

    def process_frame(self, user_id: str, frame_data: bytes) -> Optional[Dict[str, Any]]:
        """Process a frame through the OpenCV pipeline."""
        if not self._frame_processor:
            logger.warning("No frame processor set")
            return None

        session = self.get_session(user_id)
        if not session or not session.is_active:
            return None

        try:
            session.update_fps()
            result = self._frame_processor.process(frame_data)
            result['fps'] = round(session.fps, 1)
            result['frame_count'] = session.frame_count
            return result
        except Exception as e:
            logger.error(f"Frame processing error for user {user_id}: {e}")
            return None

    async def send_result(self, user_id: str, result: Dict[str, Any]) -> bool:
        """Send processing result back to the client via WebSocket."""
        session = self.get_session(user_id)
        if not session or not session.is_active:
            return False

        try:
            await session.websocket.send_text(json.dumps(result))
            return True
        except Exception as e:
            logger.error(f"Error sending result to user {user_id}: {e}")
            self.close_session(user_id)
            return False


# Global camera service instance
camera_service = CameraService()


async def handle_video_stream(websocket: WebSocket):
    """WebSocket handler for real-time video streaming."""
    await websocket.accept()
    user_id = None
    try:
        # First message should contain auth token
        auth_message = await websocket.receive_text()
        if not auth_message:
            await websocket.close()
            return

        auth_data = json.loads(auth_message)
        token = auth_data.get('token')

        if not token:
            await websocket.send_text(json.dumps({'error': 'Authentication required'}))
            await websocket.close()
            return

        # Verify JWT token
        try:
            decoded = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            user_id = str(decoded['sub'])
        except JWTError as e:
            await websocket.send_text(json.dumps({'error': f'Invalid token: {str(e)}'}))
            await websocket.close()
            return

        # Create camera session
        session = camera_service.create_session(user_id, websocket)
        await websocket.send_text(json.dumps({'status': 'connected', 'user_id': user_id}))

        # Process incoming frames
        while session.is_active:
            try:
                message = await websocket.receive_text()
                if message is None:
                    break

                # Parse frame data
                frame_data = json.loads(message)
                image_base64 = frame_data.get('frame')

                if not image_base64:
                    continue

                # Decode base64 image
                image_bytes = base64.b64decode(image_base64)

                # Process frame
                result = camera_service.process_frame(user_id, image_bytes)

                if result:
                    await camera_service.send_result(user_id, result)

            except json.JSONDecodeError:
                continue
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error for user {user_id}: {e}")
                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        if user_id:
            camera_service.close_session(user_id)