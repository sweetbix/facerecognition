import asyncio
import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..db import mark_attendance
from ..face_db import known_faces
from ..recognition import decode_jpeg_b64, recognize_frame

router = APIRouter()


def _process_frame_and_log(frame_b64: str) -> list[dict[str, Any]]:
    frame_bgr = decode_jpeg_b64(frame_b64)
    encs, names = known_faces.get_known_encodings()
    faces = recognize_frame(frame_bgr, encs, names)
    for f in faces:
        n = f.get("name")
        if n:
            mark_attendance(n)
    return faces


@router.websocket("/recognize")
async def recognize_ws(websocket: WebSocket):
    await websocket.accept()
    lock = asyncio.Lock()
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "invalid json"})
                continue

            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            frame_b64 = msg.get("frame")
            if not frame_b64 or not isinstance(frame_b64, str):
                await websocket.send_json({"error": "missing frame"})
                continue

            async with lock:
                try:
                    faces = await asyncio.to_thread(_process_frame_and_log, frame_b64)
                except Exception as e:
                    await websocket.send_json({"error": str(e), "faces": []})
                    continue

            await websocket.send_json({"faces": faces})
    except WebSocketDisconnect:
        return
