from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import auth, comics, labels, system
from app.core.config import get_settings
from app.db.init_db import init_db

settings = get_settings()


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 404:
            return await super().get_response("index.html", scope)
        return response


app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    settings.ensure_directories()
    init_db()


app.include_router(system.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(comics.router, prefix="/api")
app.include_router(labels.router, prefix="/api")

frontend_dist = Path(__file__).resolve().parent / "static"
if (frontend_dist / "index.html").exists():
    app.mount("/", SPAStaticFiles(directory=frontend_dist, html=True), name="spa")


@app.get("/", response_model=None)
def index():
    if (frontend_dist / "index.html").exists():
        return FileResponse(frontend_dist / "index.html")
    return {"message": f"{settings.app_name} backend is running."}
