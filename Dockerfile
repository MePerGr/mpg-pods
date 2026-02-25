# ── Build frontend ────────────────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json .
RUN npm install
COPY frontend/ .
RUN npm run build

# ── Build backend ─────────────────────────────────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

EXPOSE 8080

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "120", "app:app"]
