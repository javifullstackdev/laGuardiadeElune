QUESTIONS = [
    {
        "id": "origin_path",
        "prompt": "¿Cómo llegó este personaje hasta el momento en que entra en la hermandad?",
        "hint": "Elige la que más se acerque. Si ninguna encaja, escribe la tuya.",
        "kind": "choice",
        "allow_custom": True,
        "required": True,
        "options": [
            {"id": "homeland", "label": "Nació y creció en su tierra, y salió por decisión propia"},
            {"id": "exile", "label": "Tuvo que huir, exiliarse o empezar de cero lejos de casa"},
            {"id": "wanderer", "label": "Ha recorrido el mundo desde joven y no tiene un origen estable"},
            {"id": "lost", "label": "No recuerda bien su origen, o no quiere hablar de él"},
            {"id": "called", "label": "Algo —una fe, una deuda, una visión— lo empujó hasta aquí"},
        ],
    },
    {
        "id": "drive",
        "prompt": "¿Qué le mueve de verdad, cuando nadie lo está mirando?",
        "kind": "choice",
        "allow_custom": True,
        "required": True,
        "options": [
            {"id": "duty", "label": "El deber, el honor o una promesa que no puede romper"},
            {"id": "faith", "label": "La fe: la Luz, Elune, los ancestros u otra creencia"},
            {"id": "kin", "label": "Proteger a los suyos"},
            {"id": "revenge", "label": "Una venganza, una deuda o un agravio sin cerrar"},
            {"id": "knowledge", "label": "El conocimiento, el poder o entender el mundo"},
            {"id": "survive", "label": "Sobrevivir. Lo demás viene después"},
        ],
    },
    {
        "id": "temper",
        "prompt": "¿Cómo suele tratar a los demás?",
        "kind": "choice",
        "allow_custom": True,
        "required": True,
        "options": [
            {"id": "calm", "label": "Calmado y reflexivo; piensa antes de hablar"},
            {"id": "warm", "label": "Cálido y cercano; se gana a la gente fácil"},
            {"id": "reserved", "label": "Reservado; cuesta que se abra"},
            {"id": "sharp", "label": "Irónico o cortante; usa el humor como escudo"},
            {"id": "impulsive", "label": "Impulsivo; actúa y luego, si acaso, se explica"},
        ],
    },
    {
        "id": "shadow",
        "prompt": "¿Qué le pesa?",
        "kind": "choice",
        "allow_custom": True,
        "required": True,
        "options": [
            {"id": "loss", "label": "Una pérdida que no ha superado"},
            {"id": "guilt", "label": "Una culpa o una decisión de la que no se perdona"},
            {"id": "fear", "label": "Un miedo concreto que evita a toda costa"},
            {"id": "secret", "label": "Un secreto que no puede contar todavía"},
            {"id": "oath", "label": "Una promesa incumplida o un deber a medias"},
        ],
    },
    {
        "id": "guard",
        "prompt": "¿Por qué está, o quiere estar, en la Guardia de Elune?",
        "kind": "choice",
        "allow_custom": True,
        "required": True,
        "options": [
            {"id": "purpose", "label": "Busca un propósito y cree que puede encontrarlo aquí"},
            {"id": "bond", "label": "Le unió un compañero, un mentor o alguien de la hermandad"},
            {"id": "debt", "label": "Debe algo a la orden, o la orden le dio una segunda oportunidad"},
            {"id": "home", "label": "Encontró un hogar, no solo una causa"},
            {"id": "unsure", "label": "Todavía no lo tiene claro"},
        ],
    },
    {
        "id": "look",
        "prompt": "Si alguien lo viera por primera vez, ¿qué destacaría?",
        "kind": "choice",
        "allow_custom": True,
        "required": True,
        "options": [
            {"id": "scar", "label": "Una cicatriz, una marca o una herida visible"},
            {"id": "gear", "label": "Su armadura, ropa o la forma en que se presenta"},
            {"id": "gaze", "label": "La mirada, el gesto o cómo ocupa el espacio"},
            {"id": "token", "label": "Un objeto que siempre lleva encima"},
            {"id": "plain", "label": "Nada en especial; pasa desapercibido a propósito"},
        ],
    },
    {
        "id": "note",
        "prompt": "¿Qué más debería saber el Eremita para escribir la ficha?",
        "hint": "Nombres, fechas, detalles que no caben en las preguntas. Opcional.",
        "kind": "text",
        "allow_custom": False,
        "required": False,
        "options": [],
    },
]

QUESTION_BY_ID = {q["id"]: q for q in QUESTIONS}


def _clean(value: str | None) -> str:
    return " ".join((value or "").split()).strip()


def normalize_answers(raw: dict | None) -> dict:
    if not isinstance(raw, dict):
        return {}
    out: dict = {}
    for question in QUESTIONS:
        item = raw.get(question["id"])
        if not isinstance(item, dict):
            continue
        if question["kind"] == "text":
            text = _clean(item.get("text"))
            if text:
                out[question["id"]] = {"text": text}
            continue
        option = _clean(item.get("option"))
        text = _clean(item.get("text"))
        valid_ids = {o["id"] for o in question["options"]}
        if option == "custom" and question.get("allow_custom") and text:
            out[question["id"]] = {"option": "custom", "text": text}
        elif option in valid_ids:
            entry = {"option": option}
            if text:
                entry["text"] = text
            out[question["id"]] = entry
    return out


def answers_complete(answers: dict) -> bool:
    for question in QUESTIONS:
        if not question.get("required"):
            continue
        if question["id"] not in answers:
            return False
    return True


def answer_label(question_id: str, answer: dict) -> str:
    question = QUESTION_BY_ID.get(question_id)
    if not question or not isinstance(answer, dict):
        return ""
    if question["kind"] == "text":
        return _clean(answer.get("text"))
    option = answer.get("option")
    if option == "custom":
        return _clean(answer.get("text"))
    for item in question["options"]:
        if item["id"] == option:
            extra = _clean(answer.get("text"))
            return f"{item['label']}" + (f" — {extra}" if extra else "")
    return _clean(answer.get("text"))


def formatted_answers(answers: dict | None) -> list[dict]:
    data = normalize_answers(answers)
    rows = []
    for question in QUESTIONS:
        value = answer_label(question["id"], data.get(question["id"], {}))
        if not value:
            continue
        rows.append({
            "id": question["id"],
            "prompt": question["prompt"],
            "value": value,
        })
    return rows


def has_public_sheet(char) -> bool:
    return char.bio_status == "published" and bool(char.biography)
