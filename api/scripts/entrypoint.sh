#!/bin/sh
set -e

echo "[api] waiting for database..."
python - <<'PY'
import os, time, sys
from sqlalchemy import create_engine, text

url = os.environ.get("DATABASE_URL")
if not url:
    print("DATABASE_URL is required", file=sys.stderr)
    sys.exit(1)

engine = create_engine(url, pool_pre_ping=True)
for attempt in range(60):
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[api] database is ready")
        break
    except Exception as exc:
        print(f"[api] db not ready ({attempt+1}/60): {exc}")
        time.sleep(2)
else:
    print("[api] database never became ready", file=sys.stderr)
    sys.exit(1)
PY

echo "[api] running alembic upgrade head..."
python -m alembic upgrade head

echo "[api] starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
