# Written summary (181 words)

**GlycoTwin — a mechanistic digital twin for antibody glycosylation**

What actually controls Fc-galactosylation across scale? Our mechanistic model says the
**clone dominates the process by ~35×**: B4GALT1 expression moves galactosylation +35 pp,
while every scale-related process parameter — CO₂ stripping, dissolved O₂ — moves it ~1 pp
or less. This overturns a common CHO mental model that galactosylation degrades at scale
because dissolved CO₂ acidifies the Golgi and slows galactosyltransferase. We tested that
*in silico* with a literature-parameterized CHO fed-batch → Golgi → glycan model (no data
fitting), driven by an agentic experiment loop. As pCO₂ rises 60 → 74 mmHg bench →
manufacturing, galactosylation is **robust** (+1 pp) — because Golgi pH straddles the
galactosyltransferase pH optimum (~6.4) where the pH–activity curve is flat; dissolved O₂
moves it 0 pp. The practical implication: at scale-up, spend control effort on clone and
media, not CO₂ stripping.

The finding is reproducible (`research/reproduce.sh`), mechanistically transparent, and
grounded entirely in public literature. It was produced with GlycoTwin — a single-file,
zero-install interactive twin running the whole molecule → process → CQA → control chain,
with a governed agent-optimization loop and a recalibration skill for any product.
