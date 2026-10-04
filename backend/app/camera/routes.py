import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.opencv.processor import opencv_processor, is_warming_up
from app.camera.service import camera_service, handle_video_stream
from app.ai.yolo_service import (
    yolo_service,
    CABIN_ENTER_CONF,
    PHONE_ENTER_CONF,
    YOLO_FLOOR_CONF,
    YOLO_IMGSZ,
    YOLO_MIN_INTERVAL_MS,
)
from app.ai.mediapipe_service import mediapipe_service
from app.auth.controller import get_current_user_id

logger = logging.getLogger(__name__)

camera_router = APIRouter(prefix='/api/video')


class FrameBody(BaseModel):
    frame: Optional[str] = None
    ride_id: Optional[int] = None


def models_ready_state() -> dict:
    """Live readiness of every model the frame pipeline needs, read from the services."""
    yolo = bool(yolo_service.is_loaded)
    face = bool(mediapipe_service.face_available)
    hand = bool(mediapipe_service.hands_available)
    warming = is_warming_up()
    return {
        # Nothing is ready while the background warm-up thread is running: a model
        # can be loaded but still hold its inference lock, and a frame must never
        # wait on it. Face landmarks are what produce a score, so both YOLO and the
        # face landmarker have to be up and warmed.
        'ready': (not warming) and yolo and face,
        'warming_up': warming,
        'yolo': yolo,
        'face': face,
        'hand': hand,
    }


@camera_router.post('/process_frame')
async def process_frame(body: FrameBody, user_id: str = Depends(get_current_user_id)):
    """HTTP endpoint to process a live webcam frame with YOLO11 AI and MediaPipe."""
    try:
        readiness = models_ready_state()
        if not readiness['ready']:
            # Refuse before decoding the frame: the caller must never wait on a
            # model that is still loading, and must never be told "safe".
            warming = readiness['warming_up']
            return JSONResponse(
                {
                    'success': False,
                    'reason': 'warming_up' if warming else 'not_ready',
                    'message': (
                        'Detection models are still warming up.'
                        if warming
                        else 'Detection models are not available.'
                    ),
                    'models_ready': readiness,
                },
                status_code=503,
            )

        frame_base64 = body.frame

        if not frame_base64:
            return JSONResponse({'success': False, 'message': 'No video frame data provided.'}, status_code=400)

        result = opencv_processor.process_base64_frame(
            frame_base64,
            user_id=str(user_id),
            ride_id=body.ride_id,
        )
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
async def reset_camera_session(user_id: str = Depends(get_current_user_id), ride_id: Optional[int] = Query(None)):
    """Starts a fresh in-memory monitoring session."""
    yolo_service.reset_session(str(user_id), ride_id)
    mediapipe_service.reset_temporal_state(str(user_id), ride_id)
    return JSONResponse({'success': True, 'session_summary': yolo_service.get_session_summary(str(user_id), ride_id)}, status_code=200)


@camera_router.get('/session/summary')
async def camera_session_summary(user_id: str = Depends(get_current_user_id), ride_id: Optional[int] = Query(None)):
    """Returns the active in-memory monitoring session summary."""
    return JSONResponse(yolo_service.get_session_summary(str(user_id), ride_id), status_code=200)


@camera_router.post('/session/set_ride')
async def set_ride_context(ride_id: int, user_id: str = Depends(get_current_user_id)):
    """Set the current ride context for the user's session."""
    yolo_service.set_ride(str(user_id), ride_id)
    return JSONResponse({'success': True, 'ride_id': ride_id}, status_code=200)


@camera_router.post('/session/clear_ride')
async def clear_ride_context(user_id: str = Depends(get_current_user_id)):
    """Clear the ride context for the user's session."""
    yolo_service.clear_ride(str(user_id))
    return JSONResponse({'success': True}, status_code=200)


@camera_router.get('/status')
async def camera_status():
    """Returns camera, YOLO11 AI & MediaPipe processing status."""
    from app.ai.session_manager import (
        CONFIRM_MIN_HITS,
        CONFIRM_WINDOW_YOLO_RUNS,
        TRACK_CLEAR_SECONDS,
        TRACK_OCCLUSION_SECONDS,
    )
    from app.opencv.processor import TORCH_NUM_THREADS

    return JSONResponse(
        {
            'status': 'online',
            'models_ready': models_ready_state(),
            'yolo': {
                'loaded': yolo_service.is_loaded,
                'model_path': yolo_service.model_path,
                'task': yolo_service.task,
                'classes_count': len(yolo_service.classes) if yolo_service.classes else 0,
                'monitored_cabin_classes': yolo_service.cabin_classes,
                'person_class_available': yolo_service.person_class_available,
                'imgsz': YOLO_IMGSZ,
                'floor_confidence': YOLO_FLOOR_CONF,
                'enter_confidence': {
                    'phone': PHONE_ENTER_CONF,
                    'other': CABIN_ENTER_CONF,
                },
                'confirm_rule': f'{CONFIRM_MIN_HITS} of the last {CONFIRM_WINDOW_YOLO_RUNS} YOLO runs',
                'track_clear_seconds': TRACK_CLEAR_SECONDS,
                'track_occlusion_seconds': TRACK_OCCLUSION_SECONDS,
                'min_interval_ms': YOLO_MIN_INTERVAL_MS,
                'torch_num_threads': TORCH_NUM_THREADS,
                'device': yolo_service.device,
            },
            'mediapipe': {
                'face_landmarker_loaded': mediapipe_service.face_available,
                'hand_landmarker_loaded': mediapipe_service.hands_available,
                'face_model_path': mediapipe_service.face_model_path,
                'hand_model_path': mediapipe_service.hand_model_path,
                'max_width': mediapipe_service.MEDIAPIPE_MAX_WIDTH,
            },
        },
        status_code=200,
    )


@camera_router.websocket('/stream')
async def video_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time video streaming."""
    await handle_video_stream(websocket)