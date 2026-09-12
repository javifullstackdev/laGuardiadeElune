from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.post import Post
from app.schemas.post import PostResponse

router = APIRouter(
    prefix="/posts",
    tags=["posts"]
)

@router.get("/", response_model=list[PostResponse])
def get_posts(db: Session = Depends(get_db)):
    posts = db.query(Post).all()
    return posts

@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post