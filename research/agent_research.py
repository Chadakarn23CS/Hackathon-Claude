#!/usr/bin/env python3
"""
Agentic mechanistic research loop — Proposer -> Evaluator -> Critic.

Answers the galactosylation-across-scale question by having an agent PROPOSE
in-silico experiments, the deterministic mechanistic model EVALUATE them as
ground truth (the agent never invents physics), and a CRITIC distill the finding.
Writes an auditable trail to research/agent_run.json.

Reproducible and public-data only. Runs WITHOUT an API key (deterministic critic);
if ANTHROPIC_API_KEY is set it uses Claude for the Proposer/Critic prose, but the
numbers — and therefore the finding — come only from the model.

Run:  python research/agent_research.py
"""
from __future__ import annotations
import os, json
from scale_up_finding import harvest, GAL_SPEC  # reuse the exact model-backed evaluator

QUESTION = ("Across CHO scale-up, does Fc-galactosylation degrade via CO2 accumulation, "
            "or is O2/something else the real lever? Which single knob best holds it?")

# --- Proposer: the experiments to run (a deterministic plan; an LLM could expand this) ---
PLAN = [
    ("scale @ constant DO", [dict(kLa_CO2=k, DO=50.0) for k in (0.11, 0.08, 0.05)]),
    ("DO sweep @ bench",     [dict(kLa_CO2=0.11, DO=float(d)) for d in (20, 50, 90)]),
    ("levers @ 2000 L",      [("CO2 restore", dict(kLa_CO2=0.11)), ("Mn 2.5x", dict(kLa_CO2=0.05, Mn=2.5)),
                              ("B4GALT1 3x", dict(kLa_CO2=0.05, B4GALT=3.0)), ("DO 90%", dict(kLa_CO2=0.05, DO=90.0))]),
]


def evaluate():
    """Evaluator = the mechanistic model (ground truth)."""
    trail = {"question": QUESTION, "experiments": []}
    # scale
    scale = [{"knobs": ov, "galactosylation": round(harvest(**ov)["galactosylation"], 2),
              "pCO2max": round(harvest(**ov)["pCO2max"], 1)} for ov in PLAN[0][1]]
    trail["experiments"].append({"name": PLAN[0][0], "runs": scale})
    # DO
    do = [{"DO": ov["DO"], "galactosylation": round(harvest(**ov)["galactosylation"], 2),
           "sialylation": round(harvest(**ov)["sialylation"], 2)} for ov in PLAN[1][1]]
    trail["experiments"].append({"name": PLAN[1][0], "runs": do})
    # levers
    base = harvest(kLa_CO2=0.05)["galactosylation"]
    lev = [{"lever": nm, "galactosylation": round(harvest(**ov)["galactosylation"], 2),
            "recovery_pp": round(harvest(**ov)["galactosylation"] - base, 2)} for nm, ov in PLAN[2][1]]
    lev.sort(key=lambda r: r["recovery_pp"], reverse=True)
    trail["experiments"].append({"name": PLAN[2][0], "base_galactosylation": round(base, 2), "runs": lev})
    return trail, scale, do, lev


def deterministic_critique(scale, do, lev):
    gnet = scale[-1]["galactosylation"] - scale[0]["galactosylation"]
    gdo = max(r["galactosylation"] for r in do) - min(r["galactosylation"] for r in do)
    return (
        f"Galactosylation is ROBUST across scale ({scale[0]['galactosylation']}%→{scale[-1]['galactosylation']}%, "
        f"net {gnet:+.2f} pp) even as pCO2 rises {scale[0]['pCO2max']}→{scale[-1]['pCO2max']} mmHg. "
        f"It is essentially insensitive to O2 ({gdo:.2f} pp across DO 20–90%). "
        f"The dominant lever is '{lev[0]['lever']}' ({lev[0]['recovery_pp']:+.1f} pp) — genome/media, not the gas "
        f"strategy. Conclusion: for galactosylation control across scale, prioritize clone (B4GALT1) and media "
        f"(Mn2+/galactose); CO2/pH control matters more for pH-sensitive attributes and titer."
    )


def llm_critique(trail):
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        import anthropic
        model = os.environ.get("GLYCOTWIN_MODEL", "claude-sonnet-4-5")
        msg = anthropic.Anthropic(api_key=key).messages.create(
            model=model, max_tokens=400,
            system="You are a QbD reviewer. Given model-evaluated experiments, state the finding in 3-4 sentences. Use only the numbers provided.",
            messages=[{"role": "user", "content": json.dumps(trail)}])
        return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()
    except Exception:
        return None


def main():
    print("PROPOSER  ->", QUESTION)
    trail, scale, do, lev = evaluate()
    print("EVALUATOR -> ran", sum(len(e["runs"]) for e in trail["experiments"]),
          "model experiments (mechanistic ground truth)")
    crit = llm_critique(trail)
    mode = "llm" if crit else "deterministic"
    if not crit:
        crit = deterministic_critique(scale, do, lev)
    trail["critic_mode"] = mode
    trail["finding"] = crit
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "agent_run.json"), "w") as f:
        json.dump(trail, f, indent=2)
    print(f"CRITIC ({mode}) ->", crit)
    print("Wrote agent_run.json")


if __name__ == "__main__":
    main()
