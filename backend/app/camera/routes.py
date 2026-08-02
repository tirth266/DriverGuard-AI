import logging
from flask import Blueprint, request, jsonify
from app.opencv.processor import opencv_processor

logger = logging.getLogger(__name__)

camera_bp = Blueprint('camera', __name__, url_prefix='/api/video')

@camera_bp.route('/process_frame', methods=['POST'])
def process_frame():
    """HTTP endpoint to process a live webcam frame with OpenCV."""
    try:
        data = request.get_json() or {}
        frame_base64 = data.get('frame')

        if not frame_base64:
            return jsonify({'success': False, 'message': 'No video frame data provided.'}), 400

        result = opencv_processor.process_base64_frame(frame_base64)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error processing video frame: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@camera_bp.route('/status', methods=['GET'])
def camera_status():
    """Returns camera & OpenCV processing status."""
    return jsonify({
        'status': 'online',
        'opencv_active': True,
        'processor': 'OpenCV HaarCascade AI',
    }), 200
