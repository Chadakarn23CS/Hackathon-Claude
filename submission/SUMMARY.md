# Written summary (196 words)

**GlycoTwin — a mechanistic digital twin for antibody glycosylation**

What controls Fc-galactosylation — a quality attribute governing antibody potency — at scale?
Our mechanistic model gives a decisive answer: the **clone dominates the process ~35×**. Overexpressing the B4GALT1 enzyme lifts galactosylation from ~52% to ~87%,
while every scale-related process parameter (CO₂ stripping, dissolved oxygen) shifts it ≤1%. This overturns a belief taught across CHO manufacturing: that
galactosylation degrades at scale because accumulating CO₂ acidifies the Golgi and slows the enzyme. We tested it *in silico* with an agentic experiment loop
over a bioreactor-to-Golgi glycan model whose parameters come from published literature — not
regressed to fit this answer — and that reproduces an independent meta-analysis blind. From
bench to manufacturing, dissolved CO₂ climbs ~60→~74 mmHg, yet galactosylation barely moves
(~52%→~53%): Golgi pH straddles the enzyme's pH optimum (~6.4), the flat top of its activity
curve, and oxygen has no effect. The implication: **to hold glycan quality at scale, engineer the
clone and the media — not the gas strategy.**

Every result is reproducible and fully open. GlycoTwin is a single-file, zero-install twin
spanning antibody→process→quality→control, with a governed agent loop and a recalibration skill
for any molecule.
