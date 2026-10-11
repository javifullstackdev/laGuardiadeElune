"""Ensambla image_prompt_data: captura de referencia + estilo hermandad + ajustes breves."""

from __future__ import annotations

STYLE_PARAMETERS = {
    "art_style": (
        "Epic fantasy digital illustration, World of Warcraft splash art style, "
        "Hearthstone card art, detailed painterly textures, highly rendered fantasy concept art"
    ),
    "visual_quality": (
        "High-fidelity, cinematic fantasy artwork, rich textures, vibrant energy effects"
    ),
    "lighting": (
        "Dramatic and high-contrast volumetric lighting, intense glowing effects from magical "
        "and celestial energy casting bright cyan, gold, and yellow highlights on metallic and "
        "fabric surfaces, contrasting with cool dark ambient nighttime lighting"
    ),
    "color_palette": (
        "High-contrast palette featuring brilliant golds, glowing cyan, and deep shadows, "
        "set against a dark nighttime background with deep blues, purples, and starry sparkles"
    ),
}

COMPOSITION_FULL = (
    "Medium to almost full-body portrait, character facing slightly forward and looking "
    "toward the viewer with an imposing, heroic, and powerful stance, filling most of the frame"
)

COMPOSITION_FACE = (
    "Close-up to bust portrait centered on the face and shoulders, character looking toward "
    "the viewer, heroic fantasy framing, head and upper torso filling most of the frame"
)

DEFAULT_SETTING = (
    "An exterior courtyard of a grand fantasy castle or cathedral at night, Alliance-inspired "
    "architecture with warm window light and starry magical sky"
)

DEFAULT_BACKGROUND = [
    "Intricate towering fantasy architecture with spires and windows glowing with warm interior light",
    "Distinct timber and plaster medieval Alliance-style buildings with blue tiled roofs",
    "Deep purple and dark blue night sky filled with magical starry sparkles, embers, and subtle clouds",
    "Stone and dirt pathways in the mid-ground",
]


def build_image_prompt_data(kind: str, answers: dict) -> dict:
    """
    La apariencia del personaje sale de la captura adjunta.
    El formulario solo aporta ajustes opcionales (postura, expresión, énfasis).
    """
    composition = COMPOSITION_FACE if kind == "face" else COMPOSITION_FULL
    posture = (answers.get("posture") or "").strip() or None
    expression = (answers.get("expression") or "").strip() or None
    emphasis = (answers.get("emphasis") or "").strip() or None
    extra = (answers.get("extra_notes") or "").strip() or None

    return {
        "image_prompt_data": {
            "style_parameters": {
                **STYLE_PARAMETERS,
                "composition": composition,
            },
            "reference": {
                "source": "player_game_screenshot",
                "instruction": (
                    "Use the attached in-game screenshot as the primary reference for the "
                    "character's race, gender, face, body type, armor, weapons, colors, and "
                    "overall appearance. Preserve identity and outfit fidelity from the screenshot."
                ),
            },
            "player_adjustments": {
                "posture_or_action": posture,
                "expression": expression,
                "emphasis": emphasis,
                "extra_notes": extra,
            },
            "environment": {
                "setting": DEFAULT_SETTING,
                "time_of_day": "Night / dusk",
                "background_elements": list(DEFAULT_BACKGROUND),
                "foreground_atmosphere": (
                    "Rising embers, magical sparks, and subtle heat distortion from glowing equipment"
                ),
            },
            "request_meta": {
                "kind": kind,
            },
        }
    }
