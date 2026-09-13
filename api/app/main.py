from fastapi import FastAPI
from app.routers import posts, auth

app = FastAPI(
    title="La Guardia de Elune API",
    version="0.1.0",
)

app.include_router(posts.router)
app.include_router(auth.router)