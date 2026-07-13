# Hackathon submission — GlycoTwin

The three required deliverables, in one place.

| # | Deliverable | Where |
|---|---|---|
| 1 | **Demo video (≤3 min)** | `submission/demo.mp4` (or the embedded player in the [main README](../README.md#demo)) |
| 2 | **Open-source repository** | This repo — Apache-2.0, all code + model + docs public |
| 3 | **Written summary (100–200 words)** | [`submission/SUMMARY.md`](SUMMARY.md) |
| + | **How I used Claude** (form question) | [`submission/CLAUDE_USAGE.md`](CLAUDE_USAGE.md) |

## The finding, in one line
Fc-galactosylation is robust across CHO scale-up (+1 pp bench→2000 L); the dominant lever is
the **clone** (B4GALT1, +35 pp), not the gas strategy — because Golgi pH straddles the
galactosyltransferase pH optimum (~6.4) where the activity curve is flat.

## Reproduce it
```bash
bash research/reproduce.sh     # regenerates the finding figures + results.json
cd cqa-studio && npm test       # 36 tests, engine ↔ Python reference ≤0.17%
```

## Live app
https://chadakarn23cs.github.io/Hackathon-Claude/ — full tool in the browser, no install.
