from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from app.database import get_db
from app.models.post import Post
from app.models.user import User
from app.schemas.post import PostResponse, PostCreate, PostUpdate
from app.dependencies import require_admin

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

@router.post("/", response_model=PostResponse, status_code=201)
def create_post(
    body: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    post = Post(
        id=uuid.uuid4(),
        title=body.title,
        content=body.content,
        category=body.category,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post

@router.patch("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: str,
    body: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    if body.title is not None:
        post.title = body.title
    if body.content is not None:
        post.content = body.content
    if body.category is not None:
        post.category = body.category
    db.commit()
    db.refresh(post)
    return post

@router.delete("/{post_id}", status_code=204)
def delete_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()