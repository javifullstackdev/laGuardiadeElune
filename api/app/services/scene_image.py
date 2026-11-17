"""Foto fija que comparten el carrusel y la lectura de una historia."""

from app.services.image_bytes import is_gif_path
from app.urls import static_url


def still_media(path: str | None) -> str | None:
    """Una foto fija se puede mostrar. Un GIF no: el carrusel y la lectura no lo reproducen."""
    if not path or is_gif_path(path):
        return None
    return static_url(path)


def story_scene_url(story, char, slide_image: str | None = None) -> str | None:
    """La misma imagen que el carrusel usa para esa historia."""
    return (
        still_media(slide_image)
        or still_media(story.carousel_image_url)
        or still_media(story.cover_url)
        or still_media(char.carousel_image_url)
        or still_media(char.custom_avatar_url)
        or char.render_url
    )
