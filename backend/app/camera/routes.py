import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.opencv.processor import opencv_processor
from app.camera.service import camera_service, handle_video_stream
from app.ai.yolo_service import yolo_service
from app.ai.mediapipe_service import mediapipe_service
from app.config import get_config

logger = logging.getLogger(__name__)

camera_router = APIRouter(prefix='/api/video')


class FrameBody(BaseModel):
    frame: Optional[str] = None


@camera_router.post('/process_frame')
async def process_frame(body: FrameBody):
    """HTTP endpoint to process a live webcam frame with YOLO11 AI."""
    try:
        frame_base64 = body.frame

        if not frame_base64:
            return JSONResponse({'success': False, 'message': 'No video frame data provided.'}, status_code=400)

        result = opencv_processor.process_base64_frame(frame_base64)
        return JSONResponse(result, status_code=200)
    except ValueError as e:
        logger.warning("Frame rejected before inference: %s", e)
        return JSONResponse({'success': False, 'message': 'The submitted frame could not be read.'}, status_code=400)
    except Exception as e:
        logger.exception("Frame processing/inference failed: %s", e)
        return JSONResponse(
            {'success': False, 'message': 'Live detection is temporarily unavailable. Please retry.'},
            status_code=503,
        )


@camera_router.post('/session/reset')
async def reset_camera_session():
    """Starts a fresh in-memory monitoring session."""
    yolo_service.reset_session()
    mediapipe_service.reset_temporal_state()
    return JSONResponse({'success': True, 'session_summary': yolo_service.get_session_summary()}, status_code=200)


@camera_router.get('/session/summary')
async def camera_session_summary():
    """Returns the active in-memory monitoring session summary."""
    return JSONResponse(yolo_service.get_session_summary(), status_code=200)


@camera_router.get('/status')
async def camera_status():
    """Returns camera, YOLO11 AI & OpenCV processing status."""
    conf_threshold = get_config()().YOLO_CONFIDENCE_THRESHOLD
    return JSONResponse(
        {
            'status': 'online',
            'yolo_loaded': yolo_service.is_loaded,
            'yolo_model_path': yolo_service.model_path,
            'yolo_task': yolo_service.task,
            'yolo_classes_count': len(yolo_service.classes) if yolo_service.classes else 0,
            'yolo_classes': yolo_service.classes,
            'confidence_threshold': conf_threshold,
            'device': yolo_service.device,
            'processor': 'YOLO11 AI Object Detection' if yolo_service.is_loaded else 'OpenCV HaarCascade AI',
            'mediapipe_available': mediapipe_service.face_available or mediapipe_service.hands_available,
            'face_landmarker_loaded': mediapipe_service.face_available,
            'hand_landmarker_loaded': mediapipe_service.hands_available,
        },
        status_code=200,
    )


@camera_router.websocket('/stream')
async def video_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time video streaming."""
    await handle_video_stream(websocket)
