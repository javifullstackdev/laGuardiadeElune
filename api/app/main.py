from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers import posts, auth, users, characters, titles

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="La Guardia de Elune API",
    version="0.1.0",
)

# Archivos subidos (avatares, etc.) servidos en /static/
app.mount("/static", StaticFiles(directory="uploads"), name="static")

app.include_router(posts.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(characters.router)
app.include_router(titles.router)
