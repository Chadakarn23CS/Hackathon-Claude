# Written summary (180 words)

**GlycoTwin — a mechanistic digital twin for antibody glycosylation**

A common mental model in CHO manufacturing says Fc-galactosylation degrades at scale
because dissolved CO₂ accumulates, acidifying the Golgi and slowing galactosyltransferase.
We tested that *in silico* with a mechanistic, literature-parameterized CHO fed-batch →
Golgi → glycan model (no data fitting), driven by an agentic experiment loop — and the
mechanism disagrees. Across bench → manufacturing, as pCO₂ rises 60 → 74 mmHg,
galactosylation is **robust** (+1 pp), because the Golgi pH straddles the galactosyltransferase
pH optimum (~6.4) where the pH–activity curve is flat. Dissolved O₂ moves galactosylation
0 pp. The lever that actually recovers galactosylation at 2000 L is the **clone** (B4GALT1,
+35 pp), not the gas strategy. The practical implication: at scale-up, spend control effort
on clone and media, not CO₂ stripping.

The finding is reproducible (`research/reproduce.sh`), mechanistically transparent, and
grounded entirely in public literature. It was produced with GlycoTwin — a single-file,
zero-install interactive twin running the whole molecule → process → CQA → control chain,
with a governed agent-optimization loop and a recalibration skill for any product.
