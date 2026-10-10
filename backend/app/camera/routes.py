import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.opencv.processor import is_warming_up, process_base64_frame_async
from app.camera.service import camera_service, handle_video_stream
from app.config import get_config, missing_model_files
from app.ai.yolo_service import yolo_service
from app.ai.mediapipe_service import mediapipe_service
from app.auth.controller import get_current_user_id
from app.rate_limit import CAMERA_STATUS_LIMIT, FRAME_LIMIT, limiter

logger = logging.getLogger(__name__)

camera_router = APIRouter(prefix='/api/video')

# The one resolved model-path block (app.config). Every status read and every
# frame gate is checked against these paths, never against the working directory.
settings = get_config()()

SETUP_HINT = 'run: python scripts/setup_models.py'


class FrameBody(BaseModel):
    frame: Optional[str] = None
    ride_id: Optional[int] = None


def models_ready_state() -> dict:
    """Live readiness of every model the frame pipeline needs, read from the services."""
    yolo = bool(yolo_service.is_loaded)
    face = bool(mediapipe_service.face_available)
    hand = bool(mediapipe_service.hands_available)
    warming = is_warming_up()
    missing = missing_model_files(
        settings.YOLO_MODEL_PATH,
        settings.MEDIAPIPE_FACE_MODEL_PATH,
        settings.MEDIAPIPE_HAND_MODEL_PATH,
    )
    return {
        # Nothing is ready while the background warm-up thread is running: a model
        # can be loaded but still hold its inference lock, and a frame must never
        # wait on it. Face landmarks are what produce a score, so both YOLO and the
        # face landmarker have to be up and warmed. A model file that is not on disk
        # can never become ready, so it keeps the whole pipeline closed.
        'ready': (not warming) and (not missing) and yolo and face,
        'warming_up': warming,
        'yolo': yolo,
        'face': face,
        'hand': hand,
        # Model files that are absent or empty. Reported, never downloaded.
        'models_missing': missing,
    }


def public_models_state() -> dict:
    """
    The readiness flags, and nothing else.

    `models_ready_state()` also carries the absolute path of every model file
    that is missing, and this endpoint's caller does not need it: the dashboard
    renders "YOLO ready / MediaPipe ready" from these four booleans and nothing
    more. An authenticated caller learns whether detection can run, not where
    the weights are on disk or at what confidence the pipeline fires.
    """
    readiness = models_ready_state()
    return {
        'ready': readiness['ready'],
        'yolo': readiness['yolo'],
        'face': readiness['face'],
        'hand': readiness['hand'],
    }


# `request` is never read below: SlowAPI's decorator inspects the signature for
# it and refuses to register a limited endpoint without one. The explicit limits
# override the global default, which at 20 FPS would otherwise cut the feed off.
@camera_router.post('/process_frame')
@limiter.limit(FRAME_LIMIT)
async def process_frame(request: Request, body: FrameBody, user_id: str = Depends(get_current_user_id)):
    """HTTP endpoint to process a live webcam frame with YOLO11 AI and MediaPipe."""
    try:
        readiness = models_ready_state()
        if not readiness['ready']:
            # Refuse before decoding the frame: the caller must never wait on a
            # model that is still loading, and must never be told "safe".
            missing = readiness['models_missing']
            if missing:
                # A model file is not on disk. This never resolves by retrying.
                reason = 'models_missing'
                message = (
                    'Missing local model file(s): '
                    + ', '.join(entry['path'] for entry in missing)
                    + f'. {SETUP_HINT}'
                )
            elif readiness['warming_up']:
                reason = 'warming_up'
                message = 'Detection models are still warming up.'
            else:
                reason = 'not_ready'
                message = 'Detection models are not available.'
            return JSONResponse(
                {
                    'success': False,
                    'reason': reason,
                    'message': message,
                    'models_ready': readiness,
                },
                status_code=503,
            )

        frame_base64 = body.frame

        if not frame_base64:
            return JSONResponse({'success': False, 'message': 'No video frame data provided.'}, status_code=400)

        result = await process_base64_frame_async(
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
    """
    Returns the active in-memory monitoring session summary.

    The body is null when no frame has been scored for this session: there is no
    measured ride, so no report is returned rather than a score that only reads
    as a clean 100/100 because nothing was ever measured. A scored session still
    returns the summary object itself, so the response shape is unchanged.
    """
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
@limiter.limit(CAMERA_STATUS_LIMIT)
async def camera_status(request: Request, user_id: str = Depends(get_current_user_id)):
    """
    Reports whether the detection pipeline can run.

    Requires a session: this answers "may I start monitoring", which is a
    question about the caller's own session, not an open liveness probe. The
    unauthenticated liveness endpoint is /api/health. `user_id` goes unused
    beyond proving the caller is authenticated.
    """
    return JSONResponse({'models_ready': public_models_state()}, status_code=200)


@camera_router.websocket('/stream')
async def video_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time video streaming."""
    await handle_video_stream(websocket)