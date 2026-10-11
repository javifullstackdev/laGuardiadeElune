FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
COPY scripts ./scripts
RUN chmod +x ./scripts/entrypoint.sh

RUN mkdir -p /app/uploads/avatars /app/uploads/stories /app/uploads/image_requests

EXPOSE 8000

ENTRYPOINT ["./scripts/entrypoint.sh"]
