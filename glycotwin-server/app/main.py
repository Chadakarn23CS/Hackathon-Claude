"""GlycoTwin API — FastAPI backend serving the mechanistic twin as the single
source of truth, plus the agent-to-agent optimization endpoint.

The Python model (cho_cqa_model.py) is imported directly; there is no separate
JS engine to keep in sync. The optional /agent/optimize endpoint runs a
proposer/critic loop that reasons about *which* operating point to try while the
deterministic model scores every candidate.
"""
from __future__ import annotations
import os
from typing import Any, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import model_service as ms
from . import agents

app = FastAPI(title="GlycoTwin API", version="1.0",
              description="Mechanistic CHO antibody glyco-CQA digital twin")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class Knobs(BaseModel):
    knobs: dict[str, float] = {}
    days: int = 13


class SensReq(BaseModel):
    knobs: dict[str, float] = {}
    cqa: str = "galactosylation"
    frac: float = 0.15


class OptReq(BaseModel):
    target: dict[str, float]
    rounds: int = 4
    use_llm: bool = True


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "model": "cho_cqa_model", "defaults": ms.DEFAULT_KNOBS}


@app.post("/api/simulate")
def simulate(req: Knobs) -> dict[str, Any]:
    return ms.simulate(req.knobs, days=req.days)


@app.post("/api/harvest")
def harvest(req: Knobs) -> dict[str, float]:
    return ms.harvest_cqa(req.knobs, days=req.days)


@app.post("/api/sensitivity")
def sensitivity(req: SensReq) -> dict[str, Any]:
    return ms.sensitivity(req.knobs, cqa=req.cqa, frac=req.frac)


def _anthropic_client() -> Optional[Any]:
    """Build an Anthropic client from the server-side key, or None (keyless mode)."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        import anthropic
        return anthropic.Anthropic(api_key=key)
    except Exception:
        return None


@app.post("/api/agent/optimize")
def agent_optimize(req: OptReq) -> dict[str, Any]:
    """Agent-to-agent optimization. Uses the LLM proposer/critic when a key is
    configured server-side and use_llm is true; otherwise a deterministic
    coordinate search. Every candidate is scored by the real model."""
    client = _anthropic_client() if req.use_llm else None
    result = agents.optimize(req.target, rounds=req.rounds, client=client)
    result["mode"] = "llm" if client is not None else "deterministic"
    return result


# serve the built frontend if present (single-container deployment)
_STATIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")
if os.path.isdir(_STATIC):
    app.mount("/", StaticFiles(directory=_STATIC, html=True), name="static")
