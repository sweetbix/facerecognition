import base64
from typing import Any

import cv2
import face_recognition
import numpy as np

from .config import FACE_TOLERANCE, RECOGNITION_SCALE


def decode_jpeg_b64(b64: str) -> np.ndarray:
    """Decode a data URL or raw base64 JPEG/PNG into BGR uint8 (OpenCV)."""
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    raw = base64.b64decode(b64)
    nparr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("invalid image data")
    return img


def recognize_frame(
    frame_bgr: np.ndarray,
    known_encodings: list[np.ndarray],
    known_names: list[str],
    *,
    scale: float = RECOGNITION_SCALE,
    tolerance: float = FACE_TOLERANCE,
) -> list[dict[str, Any]]:
    """
    Detect faces on a downscaled RGB copy, match against known encodings.
    Returns boxes in original frame coordinates: top, right, bottom, left.
    """
    if not known_encodings:
        return []

    rgb_full = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    h, w = rgb_full.shape[:2]
    if scale <= 0 or scale > 1:
        scale = 0.25

    small_w = max(1, int(w * scale))
    small_h = max(1, int(h * scale))
    rgb_small = cv2.resize(rgb_full, (small_w, small_h))

    face_locations = face_recognition.face_locations(rgb_small)
    encodings = face_recognition.face_encodings(rgb_small, face_locations)

    inv = 1.0 / scale
    results: list[dict[str, Any]] = []

    for face_encoding, loc in zip(encodings, face_locations):
        top, right, bottom, left = loc
        matches = face_recognition.compare_faces(
            known_encodings, face_encoding, tolerance=tolerance
        )
        face_dis = face_recognition.face_distance(known_encodings, face_encoding)
        match_index = int(np.argmin(face_dis))
        distance = float(face_dis[match_index])

        name: str | None = None
        if matches[match_index]:
            name = known_names[match_index]

        # Map box from small image coords to full image coords
        top_f = int(round(top * inv))
        right_f = int(round(right * inv))
        bottom_f = int(round(bottom * inv))
        left_f = int(round(left * inv))

        results.append(
            {
                "name": name,
                "distance": distance,
                "box": [top_f, right_f, bottom_f, left_f],
            }
        )

    return results
