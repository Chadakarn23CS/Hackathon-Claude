# research/ — a reproducible Research-track finding

A discrete, reproducible in-silico finding produced from the public mechanistic
model by an agentic Proposer→Evaluator→Critic loop. **Public data only; no ML;
no proprietary/employer data.** See [`FINDING.md`](FINDING.md) for the write-up.

| File | What |
|---|---|
| [`FINDING.md`](FINDING.md) | The biological question, the finding, method, provenance, independence |
| `scale_up_finding.py` | Deterministic analysis → `results.json` + `figs/*.png` |
| `agent_research.py` | Proposer→Evaluator(model)→Critic loop → `agent_run.json` (keyless-capable) |
| `reproduce.sh` | One command to regenerate everything |

## Reproduce
```bash
bash research/reproduce.sh
# or:
pip install numpy scipy matplotlib
python research/scale_up_finding.py
python research/agent_research.py
```

## The finding, in one line
Across CHO scale-up the mechanism predicts Fc-**galactosylation is robust to CO₂
accumulation** (Golgi acidification is offset by slower-growth-extended residence) and
**insensitive to O₂**; the real galactosylation levers are **genome/media (B4GALT1, Mn²⁺,
galactose), not the gas strategy** — reframing a common scale-up assumption.
