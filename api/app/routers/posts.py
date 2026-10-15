from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
import uuid
from app.database import get_db
from app.models.post import Post
from app.models.user import User
from app.schemas.post import PostResponse, PostCreate, PostUpdate
from app.dependencies import require_admin
from app.services.slugs import is_uuid, unique_slug
from app.urls import static_url

router = APIRouter(
    prefix="/posts",
    tags=["posts"]
)

POST_UPLOAD_DIR = Path("uploads/posts")
POST_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
COVER_EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_COVER_SIZE = 5 * 1024 * 1024

@router.get("/", response_model=list[PostResponse])
def get_posts(db: Session = Depends(get_db)):
    return db.query(Post).order_by(Post.published_at.desc()).all()

@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: str, db: Session = Depends(get_db)):
    column = Post.id if is_uuid(post_id) else Post.slug
    post = db.query(Post).filter(column == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.post("/cover")
async def upload_post_cover(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
):
    extension = COVER_EXTENSIONS.get(file.content_type)
    if extension is None:
        raise HTTPException(status_code=400, detail="La portada debe ser JPEG, PNG o WebP")
    content = await file.read()
    if len(content) > MAX_COVER_SIZE:
        raise HTTPException(status_code=400, detail="La portada no puede superar 5 MB")
    filename = f"{uuid.uuid4().hex}.{extension}"
    (POST_UPLOAD_DIR / filename).write_bytes(content)
    return {"cover_url": static_url(f"posts/{filename}")}

@router.post("/", response_model=PostResponse, status_code=201)
def create_post(
    body: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    post = Post(
        id=uuid.uuid4(),
        title=body.title,
        slug=unique_slug(db, Post, body.title, "post"),
        content=body.content,
        category=body.category,
        subtitle=body.subtitle,
        cover_url=body.cover_url,
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
    if body.subtitle is not None:
        post.subtitle = body.subtitle or None
    if body.cover_url is not None:
        post.cover_url = body.cover_url or None
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