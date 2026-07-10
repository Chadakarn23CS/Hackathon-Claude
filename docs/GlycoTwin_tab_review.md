# GlycoTwin — Expert Tab-by-Tab Review & Enhancement Roadmap
Reviewer lens: bioprocess modeling + bioinformatics + cell biology + biopharma/chemical engineering.

## Agent Optimize — API key handling (recommendation)
The current model is CORRECT and should be preserved:
- In-browser search (deterministic/local) needs NO key, runs offline — the honest default.
- LLM proposer is OPTIONAL and runs SERVER-SIDE with the key in the backend env var, never in the browser.
- DO NOT add a browser key field: (a) exposes the key in client JS, (b) Anthropic API blocks direct
  browser calls (CORS), (c) would falsify the "no key, runs offline" claim.
- DO add an in-app "Enable the LLM proposer" explainer: the one-line env-var + start command, with a note
  that the key stays on the user's machine. The tab already auto-detects a running backend via api.health().

## Long text → visual (highest value)
1. Two-lever mechanism (Guide paragraph) → pathway schematic: enzyme × donor → sequential build.
2. Agent Optimize governance block → pass/warn/fail badge grid (AgentGraph already covers the loop).
3. Scale-Up gas strategy → already a table (correct form; leave it).

## Tab-by-tab
| # | Tab | State | Expert addition |
|---|---|---|---|
| — | Workflow | solid spine | progress state (visited steps) → works as a checklist |
| 1 | Antibody Molecule | strong (real domains, 3D, clickable CQAs) | SNFG glycan structure diagram beside each CQA |
| 2 | Cell Biology | ER→Golgi added | SNFG monosaccharide legend; optional O-glycan "not modeled" ghost branch |
| 3 | Live Simulation | good | PLOT nucleotide-sugar donor pools over time (computed but invisible — the substrate lever) |
| 4 | Batch Monitor (Twin) | assimilation layer | residual/bias trend panel + confidence band on re-forecast |
| 5 | Sensitivity | tornado plot | two-factor interaction (non-additive CPP pairs) |
| 6 | Design Space (Q8) | 2-D contour | NOR/PAR overlay (ICH Q8 language reviewers expect) |
| 7 | Process Control | PID on pCO₂ | disturbance-rejection demo (step in CO₂ → controller recovers) |
| 8 | Robustness (Cpk) | Monte Carlo + histogram w/ spec-limit lines + Cpk cards | ALREADY COMPLETE — RobustnessView already plots per-CQA histograms with dashed spec-limit lines and Cpk cards; no change needed |
| 9 | Scale-Up | gas strategy added | spatial/CFD pCO₂ field extension (research track) |
| 10 | Agent Optimize | loop + governance | LLM-setup explainer + governance badge grid |
| — | How to Use | provenance + scope | two-lever pathway diagram |

## Single highest-impact addition
#3 — plot the nucleotide-sugar donor pools (UDP-GlcNAc, UDP-Gal, GDP-Fuc, CMP-NeuAc) over time in Live
Simulation. They are already computed each hour but never shown; plotting them makes the SUBSTRATE lever
visible, completing the two-lever biology story (enzymes are shown via Cell Biology activity; donors are not).

## Priority order (value per effort)
1. Donor-pool traces in Live Simulation (substrate lever visible) — small, high value.
2. Two-lever pathway diagram in Guide (core concept, text→visual).
3. Robustness histogram with spec limits — ALREADY PRESENT in RobustnessView (no build needed).
4. LLM-setup explainer in Agent Optimize (security-correct, low effort).

## Build status (this pass)
- DONE: donor-pool traces (Live Simulation), two-lever pathway diagram (Guide), LLM-setup explainer (Agent Optimize).
- SKIPPED as already-complete: Robustness histogram (RobustnessView already has it).
- REMAINING: Sensitivity interactions, Control disturbance demo, Monitor bias trend, Design Space NOR/PAR, Antibody SNFG diagrams.
5. Design Space NOR/PAR overlay (Q8 credibility).
6+. Sensitivity interactions, Control disturbance demo, Monitor bias trend (larger).
