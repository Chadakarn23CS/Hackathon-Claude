# GlycoTwin — full-stack backend

A FastAPI service that turns the GlycoTwin digital twin from a single offline HTML
file into a deployable web application, and adds an **agent-to-agent optimization**
endpoint that a static file cannot host.

## Why this exists (what it fixes vs. the single-file HTML)

| Limitation of the single-file HTML | How the backend fixes it |
|---|---|
| The physics is a hand-maintained **JavaScript port** of the Python model; every recalibration means editing two codebases and re-syncing test fixtures. | The backend **imports `cho_cqa_model.py` directly**. The Python model is the single source of truth. No port, no fixtures to sync, no ≤0.17% caveat. |
| No backend → **no live agents** (an LLM needs a server + a key). | An `/api/agent/optimize` endpoint runs the proposer/critic loop **server-side**, with the API key held safely in an env var — never in the browser. |
| Just a file — hard to integrate with internal systems. | A REST API (`/docs` gives OpenAPI) + a Docker container your org can host behind its own firewall. |

The single-file HTML is still valuable as an **offline export**; this backend is the
production form.

## Architecture

```
  React frontend  ──HTTP──▶  FastAPI  ──imports──▶  cho_cqa_model.py  (the physics)
        │                       │
        │                       └── /api/agent/optimize ──▶  Anthropic API (server-side key)
        │                                                     │
        └───────────────────────────  agent loop:  Proposer ⇄ Evaluator(model) ⇄ Critic
```

**The agent loop's honest division of labor:** the LLM agents only decide *which*
operating point to try next. Every candidate is scored by the **deterministic model**
(the Evaluator). The physics is never hallucinated.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/health` | status + model defaults |
| POST | `/api/simulate` | full time-course (hours) + production-weighted harvest CQA |
| POST | `/api/harvest` | just the harvest CQA profile |
| POST | `/api/sensitivity` | one-at-a-time tornado for a chosen CQA |
| POST | `/api/agent/optimize` | agent-to-agent search for knobs hitting a target CQA profile |

Request bodies: `{"knobs": {"Mn": 2.5, "Fgal": 0.18}, "days": 13}`. Optimize:
`{"target": {"galactosylation": 62, "afucosylation": 6}, "rounds": 4, "use_llm": true}`.

## Run locally

```bash
pip install -r requirements.txt
# with live agents (LLM proposer/critic):
export ANTHROPIC_API_KEY=sk-...          # server-side only, never in the browser
uvicorn app.main:app --reload --port 8000
# open http://localhost:8000/docs
```

Without `ANTHROPIC_API_KEY`, the optimize endpoint runs a **deterministic coordinate
search** so the loop still works offline — same plumbing, non-LLM proposer.

## Docker (single container: API + frontend)

```bash
# 1. build the React frontend and drop it in static/  (see ../cqa-studio)
#    npm run build && cp -r ../cqa-studio/dist/* static/
# 2. build & run
docker build -t glycotwin .
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=sk-... glycotwin
```

The key is passed at `docker run` time (`-e`), never baked into the image.

## Verified

- Baseline reproduces the reference model exactly: titer 5325 mg/L, peak VCD 20.4e6,
  pCO₂max 59.8 mmHg.
- Sensitivity ranks galactose feed / temperature / B4GALT as the top galactosylation
  levers (physically correct).
- The agent loop's plumbing is verified against the real model: with the keyless
  deterministic proposer, score (sum of squared CQA deviations) improved from 21.4 to
  2.37 over the first four rounds as it tuned B4GALT up and FUT8 down, then oscillated
  (20.4) because coordinate search is a crude optimizer — the run did NOT fully converge
  (best score 2.37 is retained by best-tracking). This confirms the Proposer→Evaluator→
  Critic mechanics and that every candidate is scored by the deterministic model; the LLM
  proposer (enabled with an API key) is the intelligent search that replaces the crude
  fallback.
