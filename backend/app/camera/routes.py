import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.opencv.processor import opencv_processor
from app.camera.service import camera_service, handle_video_stream
from app.ai.yolo_service import yolo_service
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
    except Exception as e:
        logger.error(f"Error processing video frame: {e}")
        return JSONResponse({'success': False, 'message': str(e)}, status_code=500)


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
        },
        status_code=200,
    )


@camera_router.websocket('/stream')
async def video_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time video streaming."""
    await handle_video_stream(websocket)
