import asyncio
import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import posts, auth, users, characters, titles, stories, likes, claims, wiki, hero, bios, image_requests, share, seasons, points, bank
from app.services import scheduler
from app.services.seasons import sync_in_background as season_sync_in_background

# Los loggers de uvicorn no propagan; esto solo da salida a los de la app (tareas periódicas…)
logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(name)s - %(message)s")

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

_ENV = os.getenv("ENV", "development").lower()
_docs = None if _ENV == "production" else "/docs"
_redoc = None if _ENV == "production" else "/redoc"

app = FastAPI(
    title="La Guardia de Elune API",
    version="0.1.0",
    docs_url=_docs,
    redoc_url=_redoc,
)

_cors = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000",
    ).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Debe registrarse antes del mount de /static para tener prioridad sobre él.
app.include_router(share.router)

# Archivos subidos (avatares, etc.) servidos en /static/
app.mount("/static", StaticFiles(directory="uploads"), name="static")


@app.on_event("startup")
async def start_background_sync():
    # Se guarda la referencia para que el recolector no cancele la tarea a medias
    if scheduler.enabled():
        app.state.background_sync = asyncio.create_task(scheduler.run_forever())
    else:
        app.state.background_sync = asyncio.create_task(season_sync_in_background())


@app.on_event("shutdown")
async def stop_background_sync():
    task = getattr(app.state, "background_sync", None)
    if task is None:
        return
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(posts.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(characters.router)
app.include_router(titles.router)
app.include_router(stories.router)
app.include_router(likes.router)
app.include_router(claims.router)
app.include_router(wiki.router)
app.include_router(hero.router)
app.include_router(bios.router)
app.include_router(image_requests.router)
app.include_router(seasons.router)
app.include_router(points.router)
app.include_router(bank.router)
