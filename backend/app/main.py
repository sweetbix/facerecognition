import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .face_db import known_faces
from .routes import api_router
from .routes import ws as ws_routes


def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
    return [o.strip() for o in raw.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    known_faces.load_all()
    yield


app = FastAPI(title="Face Recognition API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(ws_routes.router, prefix="/ws")


@app.get("/health")
def health():
    return {"status": "ok"}
