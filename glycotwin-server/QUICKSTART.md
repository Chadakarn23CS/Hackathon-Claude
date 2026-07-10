# GlycoTwin — QUICKSTART (stand up the full stack in ~5 min)

You need the full stack running for the **Agent Optimize** tab (the agent loop runs
on the server). Every other tab works from the single HTML file with no server.

Two ways to run it. Docker is the demo-ready path; the local Python path is fastest
for iterating.

---

## Option A — Docker (recommended for the demo)

```bash
# from the unpacked glycotwin-server/ directory
docker build -t glycotwin .

# run WITH live LLM agents (key stays server-side, never in the browser):
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=sk-ant-… glycotwin

# or run WITHOUT a key — the agent loop falls back to deterministic search:
docker run -p 8000:8000 glycotwin
```

Then open **http://localhost:8000** — this serves the full app (all 12 tabs) AND the API
from one container. The Agent Optimize tab will show "backend connected".

## Option B — local Python (fastest to iterate)

```bash
# from the unpacked glycotwin-server/ directory
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-…          # optional; omit for deterministic mode
uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000** (serves the bundled frontend) or
**http://localhost:8000/docs** for the interactive API explorer.

---

## Smoke tests (paste these — confirm the stack is live)

```bash
# 1. health — should print {"status":"ok",...}
curl -s http://localhost:8000/api/health

# 2. baseline simulation — expect titer ~5325, galactosylation ~53
curl -s -X POST http://localhost:8000/api/simulate \
  -H 'content-type: application/json' -d '{"knobs":{}}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("titer",round(d["titer"]),"Gal",round(d["harvest"]["galactosylation"],1),"points",len(d["t_hours"]))'

# 3. a knob response — high-gal preset should push galactosylation up
curl -s -X POST http://localhost:8000/api/simulate \
  -H 'content-type: application/json' -d '{"knobs":{"Mn":2.5,"Fgal":0.18}}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("hi-gal Gal",round(d["harvest"]["galactosylation"],1))'

# 4. sensitivity tornado for galactosylation
curl -s -X POST http://localhost:8000/api/sensitivity \
  -H 'content-type: application/json' -d '{"knobs":{},"cqa":"galactosylation"}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("top levers:",[(e["knob"],round(e["delta"],1)) for e in d["effects"][:3]])'

# 5. the agent loop — target a glycan profile, watch it search
curl -s -X POST http://localhost:8000/api/agent/optimize \
  -H 'content-type: application/json' \
  -d '{"target":{"galactosylation":62,"afucosylation":6,"sialylation":7},"rounds":4,"use_llm":true}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("mode",d["mode"],"best score",round(d["best"]["score"],2),"converged",d["converged"])'
```

Expected: test 5 prints `mode llm` when a key is set (else `deterministic`), and a best
score that is lower than the round-0 score.

---

## Demo flow (2 minutes, once it's up)

1. Open **Cell Biology** — drag CO₂ stripping down, watch the Golgi acidify and
   galactosylation fall. (This is the scale-up mechanism.)
2. Open **Agent Optimize** — set a target profile, hit **Run optimization**, and narrate
   the flow graph lighting up Proposer → Evaluator (model) → Critic as the score drops.
3. Open **Process Control** — flip to Closed loop (PID), move the setpoint, show the
   galactosylation-vs-titer tradeoff.

The single-file `cqa_studio_app.html` remains the offline fallback if the network or
Docker misbehaves during the demo — only the Agent Optimize tab needs the server.

## Troubleshooting

- **Agent Optimize says "backend offline"** — the server isn't running or the app was
  opened as a `file://` HTML instead of from `http://localhost:8000`. Open it from the
  server origin, or set `VITE_API_BASE` at build time to point at the API URL.
- **`mode: deterministic` when you wanted LLM** — `ANTHROPIC_API_KEY` isn't set in the
  server's environment. Re-run with `-e ANTHROPIC_API_KEY=…` (Docker) or `export` it
  (local). The key is only ever read server-side.
- **Port 8000 in use** — change the port (`-p 8080:8000` for Docker, `--port 8080` for
  uvicorn) and use that in the URLs above.
