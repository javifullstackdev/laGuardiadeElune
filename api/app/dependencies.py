from fastapi import Depends, HTTPException, Cookie
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import os
from app.database import get_db
from app.models.user import User

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"

def get_current_user(
    token: str = Cookie(None),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="No has iniciado sesión")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.value not in ("admin", "officer"):
        raise HTTException(
            status_code=403,
            detail="No tienes permisos para realizar esta acción"
        )
    return current_user