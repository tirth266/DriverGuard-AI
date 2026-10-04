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
from urllib.parse import parse_qs

from fastapi import WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError

from app.extensions import JWT_SECRET_KEY, JWT_ALGORITHM
from app.opencv.processor import opencv_processor

logger = logging.getLogger(__name__)


@dataclass
class CameraSession:
    """Represents an active camera session for a user."""
    user_id: str
    websocket: Any
    ride_id: Optional[int] = None
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

    def set_ride(self, ride_id: Optional[int]):
        with self._lock:
            self.ride_id = ride_id


class CameraService:
    """Manages active camera sessions and WebSocket connections."""

    def __init__(self):
        self._sessions: Dict[str, CameraSession] = {}
        self._lock = threading.RLock()

    def create_session(self, user_id: str, websocket, ride_id: Optional[int] = None) -> CameraSession:
        """Create a new camera session for a user."""
        with self._lock:
            # Close existing session for this user if any
            if user_id in self._sessions:
                self.close_session(user_id)

            session = CameraSession(user_id=user_id, websocket=websocket, ride_id=ride_id)
            self._sessions[user_id] = session
            logger.info(f"Created camera session for user {user_id}, ride_id={ride_id}")
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


def extract_token_from_websocket(websocket: WebSocket) -> Optional[str]:
    """Extract JWT token from WebSocket connection.

    Supports multiple authentication methods:
    1. Query parameter: ?token=<jwt>
    2. Authorization header: Authorization: Bearer <jwt>
    3. First message: {"token": "<jwt>"} (legacy)
    """
    # Method 1: Query parameter (preferred for WebSocket)
    query_params = parse_qs(str(websocket.url.query))
    token = query_params.get('token', [None])[0]
    if token:
        return token

    # Method 2: Authorization header
    auth_header = websocket.headers.get('authorization') or websocket.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header.split(' ', 1)[1]

    # Method 3: Will be handled in handle_video_stream (first message)
    return None


async def authenticate_websocket(websocket: WebSocket) -> Optional[int]:
    """Authenticate WebSocket connection and return user_id.

    Returns None if authentication fails.
    """
    token = extract_token_from_websocket(websocket)

    # If no token in query/header, wait for first message (legacy)
    if not token:
        try:
            auth_message = await websocket.receive_text()
            if not auth_message:
                return None
            auth_data = json.loads(auth_message)
            token = auth_data.get('token')
        except Exception:
            return None

    if not token:
        await websocket.send_text(json.dumps({'error': 'Authentication required'}))
        await websocket.close(code=4001)
        return None

    # Verify JWT token
    try:
        decoded = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = str(decoded['sub'])
        return int(user_id)
    except JWTError as e:
        await websocket.send_text(json.dumps({'error': f'Invalid token: {str(e)}'}))
        await websocket.close(code=4001)
        return None


async def handle_video_stream(websocket: WebSocket, token: Optional[str] = Query(None), ride_id: Optional[int] = Query(None)):
    """WebSocket handler for real-time video streaming.

    Authentication can be provided via:
    - Query parameter: ?token=<jwt>
    - Authorization header: Authorization: Bearer <jwt>
    - First message: {"token": "<jwt>"} (legacy)
    
    Optional ride_id can be provided via query parameter: ?ride_id=<int>
    """
    await websocket.accept()
    user_id = None
    try:
        # Authenticate the connection
        user_id = await authenticate_websocket(websocket)
        if user_id is None:
            return

        # Create camera session with ride_id
        session = camera_service.create_session(str(user_id), websocket, ride_id)
        await websocket.send_text(json.dumps({'status': 'connected', 'user_id': user_id, 'ride_id': ride_id}))

        # Process incoming frames
        while session.is_active:
            try:
                message = await websocket.receive_text()
                if message is None:
                    break

                # Parse frame data (may include ride_id update)
                frame_data = json.loads(message)
                image_base64 = frame_data.get('frame')
                frame_ride_id = frame_data.get('ride_id', session.ride_id)

                if not image_base64:
                    continue

                # Update session ride_id if provided
                if frame_ride_id is not None and frame_ride_id != session.ride_id:
                    session.set_ride(frame_ride_id)

                # Process frame through unified pipeline with user/ride context
                result = opencv_processor.process_base64_frame(
                    image_base64,
                    user_id=str(user_id),
                    ride_id=session.ride_id,
                )
                result['fps'] = round(session.fps, 1)
                result['frame_count'] = session.frame_count

                await camera_service.send_result(str(user_id), result)
                session.update_fps()

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
            camera_service.close_session(str(user_id))