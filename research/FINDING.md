# Finding — What actually controls CHO Fc-galactosylation across scale?

**An independent, personal hackathon project. Built entirely from public literature and a
mechanistic model. No proprietary data, no machine learning, no employer data/models/IP.**
See [Provenance & independence](#provenance--independence).

## Biological question
A common assumption in CHO mAb manufacturing is that **Fc-galactosylation degrades at
manufacturing scale because dissolved CO₂ accumulates** (poorer CO₂ stripping in large
vessels → carbonic acid → lower Golgi-lumen pH → less-active galactosyltransferase). Is that
the right mental model — and if we want galactosylation to hold across scale, **which single
lever should we actually spend control effort on**?

I answered it *in silico* with a mechanistic, literature-parameterized CHO fed-batch → Golgi
→ CQA model (no data fitting), driving it with an agentic experiment loop and reporting a
discrete, reproducible result.

## TL;DR finding
The naive "galactosylation collapses at scale via CO₂" story is **not** what the mechanism
predicts. Three concrete, reproducible results:

1. **O₂ is not a galactosylation lever.** Varying dissolved O₂ from 20→90 % at bench scale
   moves galactosylation **0.0 pp** (it moves *sialylation* by 0.6 pp). The scale gas that
   matters for the Fc glycan is **CO₂, not O₂** — holding DO constant across scales does
   nothing for galactosylation.
2. **Galactosylation is robust to the CO₂ rise itself.** Bench→manufacturing, as CO₂-stripping
   efficiency falls (kLa 0.11→0.05) and **pCO₂ rises 59.8→73.9 mmHg**, harvest galactosylation
   changes only **+0.97 pp** (51.8→52.7 %, and it moves *up*, not down). Reason the mechanism
   gives: higher pCO₂ acidifies the Golgi (↓ activity) **but** slows growth, which **lengthens
   Golgi residence time** (↑ conversion) — the two effects nearly cancel. A lookup table or a
   single-factor intuition misses this coupling; a mechanistic model captures it.
3. **The real galactosylation levers are genome + media, not the gas strategy.** At 2000 L,
   the single most effective lever to move galactosylation is **B4GALT1 overexpression
   (+35.3 pp)**, followed by Mn²⁺ and galactose feed — versus **~1 pp** for the CO₂ gas
   strategy. Under ±10 % run-to-run variability the galactosylation capability index **Cpk
   stays high with or without CO₂ control (5.7 vs 4.8, spec 35–65 %)** — i.e. CO₂ control is
   not what keeps galactosylation in spec.

**Implication for biopharma:** to control **galactosylation** across scale-up, invest in
**clone (B4GALT1) and media (Mn²⁺/galactose)** — not in tightening the CO₂ gas strategy.
CO₂/Golgi-pH control still matters, but for **pH-sensitive dynamics and titer**, and for
attributes other than galactosylation — not for galactosylation robustness. This reframes a
common scale-up assumption and points control effort where the mechanism says it pays off.

## Method (reproducible)
- Model: `model/cho_cqa_model.py` — a 9-state fed-batch ODE → dissolved pCO₂ → Golgi-lumen pH
  → pH/Mn²⁺/donor-gated glycosyltransferase train over a growth-dependent residence time →
  glycan distribution → CQA rollup. Literature-parameterized (see provenance), **not fitted**.
- Analysis: `research/scale_up_finding.py` runs four experiments — (1) scale sweep at constant
  DO, (2) DO sweep at bench scale, (3) one-at-a-time lever recovery at 2000 L, (4) Monte-Carlo
  Cpk with/without CO₂ control — and writes `research/results.json` + `research/figs/*.png`.
- Agent loop: `research/agent_research.py` runs the same study as a **Proposer → Evaluator →
  Critic** loop (the deterministic mechanistic model is the Evaluator / ground truth — the
  agent never invents physics), producing an auditable `research/agent_run.json`. Works with or
  without an `ANTHROPIC_API_KEY` (keyless = deterministic critic).

## Results (numbers)
See `results.json` for the full table; figures in `figs/`:
- `figs/1_scale.png` — pCO₂ rises across scale while galactosylation stays flat (robustness).
- `figs/2_do.png` — galactosylation flat vs DO; sialylation is the O₂-sensitive attribute.
- `figs/3_levers.png` — lever ranking at 2000 L (B4GALT1 ≫ Mn²⁺ ≈ galactose ≫ CO₂).

## Reproduce
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install numpy scipy matplotlib
python research/scale_up_finding.py     # -> research/results.json + research/figs/*.png
python research/agent_research.py        # -> research/agent_run.json (agentic reproduction)
```
Every number traces to the public model; re-running reproduces the results bit-for-bit
(the model is deterministic). The server-vs-model parity guard
(`glycotwin-server/tests/test_fixture_parity.py`) additionally proves the app and the model
agree to ≤1e-5.

## Provenance & independence
- **Public sources only.** Parameters/mechanisms are literature-directed — CHOGlycoNET,
  Jimenez del Val 2011, Villiger 2016, and public CHO fed-batch/glycosylation studies (see
  repo `references/` and `docs/PARAMETER_PROVENANCE.md`, cited by DOI; no copyrighted PDFs
  redistributed). Contains **no proprietary, company-specific, or confidential data**.
- **Independent personal project.** Developed on personal time for a public hackathon, using
  only public literature and this open-source mechanistic model. It uses **no employer data,
  models, code, or IP**, and is **not affiliated with, and does not represent, my employer**.
- **Deliberately the no-data, mechanistic regime.** This is complementary to (and distinct
  from) data-driven ML/hybrid modeling: a mechanistic model needs no process data, extrapolates
  by construction, and is explainable — useful precisely when data is scarce (early development,
  a new clone, tech transfer). It is offered as a community/QbD-training tool, not a
  process-specific predictor.
