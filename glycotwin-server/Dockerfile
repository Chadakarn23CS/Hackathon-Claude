FROM python:3.11-slim

WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY model/ ./model/
# optional: built frontend copied to ./static (see README) for single-container deploy
COPY static/ ./static/

EXPOSE 8000
# ANTHROPIC_API_KEY is provided at runtime (docker run -e ANTHROPIC_API_KEY=...),
# never baked into the image. Without it, the agent endpoint runs deterministic mode.
# Shell form so ${PORT} (injected by Render / Cloud Run / etc.) is honored;
# falls back to 8000 for local `docker run -p 8000:8000`.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
