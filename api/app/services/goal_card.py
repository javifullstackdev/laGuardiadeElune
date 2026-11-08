"""Tarjeta de la misión de oro. La frase coincide con goalHeadline en web/lib/gold.ts."""

from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ASSETS = Path(__file__).resolve().parent.parent / "assets"
FONT_REGULAR = ASSETS / "fonts" / "Cinzel-Regular.ttf"
FONT_BOLD = ASSETS / "fonts" / "Cinzel-Bold.ttf"
QUEST = ASSETS / "quest.png"

SILVER = 100
GOLD = 10_000
TITLE = "¡Un banco para todos!"

WIDTH = 1200
HEIGHT = 630
BG = (11, 11, 11)
GOLD_BAR = (234, 179, 8)
HEADLINE = (250, 204, 21)
WHITE = (243, 244, 246)
MUTED = (156, 163, 175)
TRACK = (31, 41, 55)


def format_money(copper: int) -> str:
    gold, rest = divmod(max(0, copper), GOLD)
    silver, coins = divmod(rest, SILVER)
    parts: list[str] = []
    if gold:
        parts.append(f"{gold} de oro")
    if silver:
        parts.append(f"{silver} de plata")
    if coins or not parts:
        parts.append(f"{coins} de cobre")
    return ", ".join(parts)


def shown_money(copper: int) -> str:
    if copper <= 0:
        return "0 de oro"
    return format_money(copper)


def goal_copy(confirmed: int, goal: int) -> dict:
    safe_goal = goal if goal > 0 else 1
    reached = goal > 0 and confirmed >= goal
    if reached:
        headline = "¡Objetivo cumplido!"
    else:
        money = format_money(max(0, goal - confirmed))
        verb = "Falta" if "," not in money and money.startswith("1 ") else "Faltan"
        headline = f"¡{verb} {money} para el objetivo!"
    percent = 0.0 if goal <= 0 else min(100.0, (max(0, confirmed) / safe_goal) * 100)
    return {
        "title": TITLE,
        "headline": headline,
        "confirmed_label": shown_money(confirmed),
        "goal_label": shown_money(goal),
        "percent": percent,
    }


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [text]


def _font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def _fit(draw: ImageDraw.ImageDraw, text: str, path: Path, size: int, max_width: int, minimum: int) -> ImageFont.FreeTypeFont:
    while size > minimum and draw.textlength(text, font=_font(path, size)) > max_width:
        size -= 2
    return _font(path, size)


def _progress(image: Image.Image, x: int, y: int, width: int, height: int, percent: float) -> None:
    track = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    track_draw = ImageDraw.Draw(track)
    track_draw.rounded_rectangle((0, 0, width - 1, height - 1), radius=height // 2, fill=TRACK)
    if percent > 0:
        fill_w = max(height, int(width * percent / 100))
        fill_w = min(width, fill_w)
        fill = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        fill_draw = ImageDraw.Draw(fill)
        fill_draw.rounded_rectangle((0, 0, fill_w - 1, height - 1), radius=height // 2, fill=HEADLINE)
        track.alpha_composite(fill)
    image.paste(track, (x, y), track)


def render_goal_card(copy: dict) -> bytes:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 8), fill=GOLD_BAR)
    draw.rectangle((36, 36, WIDTH - 37, HEIGHT - 37), outline=GOLD_BAR, width=2)

    margin = 72
    text_width = WIDTH - margin * 2
    kicker = _font(FONT_REGULAR, 22)
    title_font = _fit(draw, copy["title"], FONT_BOLD, 52, text_width - 110, 32)
    headline_font = _font(FONT_BOLD, 40)
    lines = _wrap(draw, copy["headline"], headline_font, text_width)
    while len(lines) > 2 and headline_font.size > 28:
        headline_font = _font(FONT_BOLD, headline_font.size - 2)
        lines = _wrap(draw, copy["headline"], headline_font, text_width)
    label_size = 26
    label_font = _font(FONT_REGULAR, label_size)
    while (
        label_size > 18
        and draw.textlength(copy["confirmed_label"], font=label_font) + draw.textlength(copy["goal_label"], font=label_font)
        > text_width - 40
    ):
        label_size -= 2
        label_font = _font(FONT_REGULAR, label_size)

    icon = Image.open(QUEST).convert("RGBA")
    icon.thumbnail((84, 84), Image.Resampling.LANCZOS)
    image.paste(icon, (margin, 78), icon)

    text_x = margin + 108
    draw.text((text_x, 82), "LA GUARDIA DE ELUNE", font=kicker, fill=GOLD_BAR)
    draw.text((text_x, 116), copy["title"], font=title_font, fill=WHITE)

    line_gap = int(headline_font.size) + 14
    block = line_gap * len(lines)
    bar_y = 478
    title_bottom = 214
    y = title_bottom + max(12, (bar_y - title_bottom - block) // 2)
    if y + block + 16 > bar_y:
        bar_y = y + block + 24
    for line in lines:
        draw.text((margin, y), line, font=headline_font, fill=HEADLINE)
        y += line_gap

    bar_h = 26
    _progress(image, margin, bar_y, text_width, bar_h, float(copy["percent"]))
    label_y = bar_y + 42
    draw.text((margin, label_y), copy["confirmed_label"], font=label_font, fill=MUTED)
    goal_label = copy["goal_label"]
    goal_w = draw.textlength(goal_label, font=label_font)
    draw.text((WIDTH - margin - goal_w, label_y), goal_label, font=label_font, fill=MUTED)

    buffer = BytesIO()
    image.save(buffer, "JPEG", quality=85, optimize=True, progressive=True)
    return buffer.getvalue()
