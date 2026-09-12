from fastapi import FastAPI
from app.routers import posts

app = FastAPI(
    title="La Guardia de Elune API",
    version="0.1.0",
)

app.include_router(posts.router)