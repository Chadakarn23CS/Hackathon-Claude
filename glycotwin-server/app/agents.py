"""Agent-to-agent process optimization loop.

Three cooperating agents, each an LLM call with a distinct role, orbiting the
deterministic twin:

  1. Proposer  — suggests a set of process knobs to try, given the goal and history.
  2. Evaluator — NOT an LLM: runs the mechanistic model on the proposal (ground truth).
  3. Critic    — reads the evaluated result vs the target spec and tells the Proposer
                 what to change next.

The physics is never hallucinated: every candidate is scored by the real model.
The agents only reason about *which* candidate to try next. This is the honest
division of labor — deterministic model does the science, LLMs do the search.
"""
from __future__ import annotations
import json, os
from typing import Any, Callable
from . import model_service as ms

KNOB_BOUNDS = {
    "kLa_CO2": (0.03, 0.45), "pH_set": (6.8, 7.3), "mu_max": (0.018, 0.038),
    "Fglc": (0.05, 0.5), "Fgln": (0.0, 0.12), "Fgal": (0.0, 0.25),
    "asn_level": (0.2, 1.0), "Tset": (30.0, 37.5), "DO": (10.0, 90.0),
    "Mn": (0.0, 3.0), "MGAT": (0.0, 2.0), "B4GALT": (0.0, 3.0),
    "FUT8": (0.0, 2.0), "ST6GAL": (0.0, 4.0),
}


def _clip(knobs: dict[str, float]) -> dict[str, float]:
    out = {}
    for k, v in (knobs or {}).items():
        if k in KNOB_BOUNDS:
            lo, hi = KNOB_BOUNDS[k]
            out[k] = max(lo, min(hi, float(v)))
    return out


def _score(harvest: dict[str, float], target: dict[str, float]) -> float:
    """Lower is better: sum of squared % deviations across targeted CQAs."""
    return sum((harvest[k] - target[k]) ** 2 for k in target if k in harvest)


def _llm_json(client, model, system, user, fallback):
    """Call the LLM and parse a JSON object from the reply; degrade gracefully."""
    try:
        msg = client.messages.create(
            model=model, max_tokens=800, system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
        s, e = text.find("{"), text.rfind("}")
        return json.loads(text[s:e + 1])
    except Exception:
        return fallback


def optimize(target: dict[str, float], rounds: int = 4, model: str | None = None,
             client=None, progress: Callable[[dict], None] | None = None) -> dict[str, Any]:
    """Run the proposer/critic loop. `client` is an Anthropic client (injected so
    the endpoint can supply the key); if None, runs a deterministic coordinate
    search so the loop still works offline / without a key."""
    model = model or os.environ.get("GLYCOTWIN_MODEL", "claude-sonnet-4-5")
    history: list[dict] = []
    base = dict(ms.DEFAULT_KNOBS)
    best = {"knobs": {}, "harvest": ms.harvest_cqa({}), "score": None}
    best["score"] = _score(best["harvest"], target)

    for r in range(rounds):
        # ---- Proposer ----
        if client is not None:
            sys_p = ("You are a CHO bioprocess development scientist. Propose ONE set of "
                     "process knobs to move the antibody's harvest glycan CQAs toward the target. "
                     "Reply with a JSON object {\"knobs\": {name: value, ...}, \"rationale\": \"...\"}. "
                     f"Valid knobs and bounds: {json.dumps(KNOB_BOUNDS)}.")
            usr_p = (f"Target CQA profile (%): {json.dumps(target)}\n"
                     f"Baseline knobs: {json.dumps(base)}\n"
                     f"History of tries (knobs -> harvest -> score, lower better): {json.dumps(history[-4:])}\n"
                     f"Best so far: {json.dumps(best)}\n"
                     "Propose the next knobs to try.")
            prop = _llm_json(client, model, sys_p, usr_p, {"knobs": {}, "rationale": "fallback: baseline"})
        else:
            prop = _coordinate_step(target, best, history)

        knobs = _clip(prop.get("knobs", {}))
        # ---- Evaluator (ground truth: the real model) ----
        harvest = ms.harvest_cqa(knobs)
        score = _score(harvest, target)
        entry = {"round": r, "knobs": knobs, "harvest": {k: round(v, 2) for k, v in harvest.items()},
                 "score": round(score, 3), "rationale": prop.get("rationale", "")}

        # ---- Critic ----
        if client is not None:
            sys_c = ("You are a senior QbD reviewer. Given a proposed operating point, its "
                     "model-evaluated CQAs, and the target, state in ONE sentence what to change "
                     "next and why. Reply JSON {\"critique\": \"...\"}.")
            usr_c = (f"Target: {json.dumps(target)}\nProposed knobs: {json.dumps(knobs)}\n"
                     f"Evaluated harvest: {json.dumps(entry['harvest'])}\nScore: {score:.3f}")
            entry["critique"] = _llm_json(client, model, sys_c, usr_c, {"critique": ""}).get("critique", "")

        history.append(entry)
        if score < best["score"]:
            best = {"knobs": knobs, "harvest": harvest, "score": score}
        if progress:
            progress(entry)
        if score < 0.5:  # within ~0.7% RMS on each CQA
            break

    return {"target": target, "best": best, "history": history, "converged": best["score"] < 0.5}


def _coordinate_step(target, best, history):
    """Keyless fallback: nudge the most-off CQA's dominant knob.

    Walks from the LAST point tried (not only the best), so a round that fails
    to improve still advances the search instead of re-proposing an identical
    point. The per-knob step decays as tries on that knob accumulate, so the
    walk converges (and settles cleanly when a knob is pinned at its bound)
    rather than oscillating or stalling.
    """
    # map each CQA to its primary lever + direction
    drivers = {"galactosylation": ("B4GALT", +1), "afucosylation": ("FUT8", -1),
               "sialylation": ("ST6GAL", +1), "high_mannose": ("asn_level", +1)}
    ref = history[-1] if history else {"knobs": dict(best["knobs"]), "harvest": best["harvest"]}
    h = ref["harvest"]; knobs = dict(ref["knobs"])
    worst = max(target, key=lambda k: abs(h.get(k, 0) - target[k]) if k in h else 0)
    knob, sign = drivers.get(worst, ("B4GALT", +1))
    cur = knobs.get(knob, ms.DEFAULT_KNOBS.get(knob, 1.0))
    need = target[worst] - h.get(worst, 0)
    tries = sum(1 for e in history if e.get("rationale", "").startswith(f"coordinate step on {knob} "))
    step = sign * (0.15 if need > 0 else -0.15) * max(abs(cur), 0.5) * 0.6 ** tries
    knobs[knob] = cur + step
    return {"knobs": knobs, "rationale": f"coordinate step on {knob} to move {worst}"}
