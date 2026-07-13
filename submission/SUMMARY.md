# Written summary (199 words)

**GlycoTwin — a mechanistic digital twin for antibody glycosylation**

What controls Fc-galactosylation — a quality attribute governing antibody potency — at scale?
Our mechanistic model answers: the **clone dominates the process ~35×**. Overexpressing B4GALT1 lifts galactosylation from ~52% to ~87%,
while every scale-related process parameter (CO₂ stripping, dissolved oxygen) shifts it ≤1%. This overturns a belief taught across CHO manufacturing: that
galactosylation degrades at scale because accumulating CO₂ acidifies the Golgi and slows it. We tested it *in silico* with an agentic experiment loop over a bioreactor-to-Golgi
model whose parameters come from published literature — not regressed to fit this answer — and
that reproduces an independent meta-analysis blind. From
bench to manufacturing, dissolved CO₂ climbs ~60→~74 mmHg, yet galactosylation barely moves
(~52%→~53%): Golgi pH straddles the enzyme's pH optimum (~6.4), the flat top of its activity
curve; oxygen has no effect. The implication: **for this quality attribute, control effort
belongs on the clone and media, not on chasing CO₂** — galactosylation is robust to the
scale-driven gas swing — productivity, not glycan quality, is the scale-up risk.

Every result is reproducible and open. GlycoTwin is a single-file twin spanning
antibody→process→quality→control, with a governed agent loop and recalibration skill.
