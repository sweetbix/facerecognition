from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..face_db import known_faces

router = APIRouter()


@router.get("")
def list_faces():
    return {"faces": [{"name": n} for n in known_faces.list_faces()]}


@router.get("/{name}/image")
def get_face_image(name: str):
    p = known_faces.get_image_path(name)
    if p is None or not p.is_file():
        raise HTTPException(status_code=404, detail="face not found")
    media = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
    }.get(p.suffix.lower(), "application/octet-stream")
    return FileResponse(p, media_type=media)


@router.post("")
async def upload_face(name: str = Form(...), file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty file")
    suffix = Path(file.filename or "").suffix or ".jpg"
    try:
        saved = known_faces.add_face(name, data, suffix)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"name": saved}


@router.delete("/{name}")
def delete_face(name: str):
    if not known_faces.delete_face(name):
        raise HTTPException(status_code=404, detail="face not found")
    return {"ok": True}
