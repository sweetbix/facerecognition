from fastapi import APIRouter

from . import attendance, faces

api_router = APIRouter()
api_router.include_router(faces.router, prefix="/faces", tags=["faces"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
