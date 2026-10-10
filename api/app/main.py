import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import posts, auth, users, characters, titles, stories, likes, claims, wiki, hero, bios

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

# Archivos subidos (avatares, etc.) servidos en /static/
app.mount("/static", StaticFiles(directory="uploads"), name="static")


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
