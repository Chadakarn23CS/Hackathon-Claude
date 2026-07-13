# Written summary (200 words)

**GlycoTwin — a mechanistic digital twin for antibody glycosylation**

What controls Fc-galactosylation — a quality attribute governing antibody potency — as
a process scales up? Our mechanistic model gives a decisive answer: the **clone dominates the
process ~35×**. Overexpressing the B4GALT1 enzyme raises galactosylation by 35
percentage points, while every scale-related process parameter (CO₂ stripping, dissolved oxygen)
moves it ~1 point or less. This overturns a belief taught across CHO manufacturing: that
galactosylation degrades at scale because accumulating CO₂ acidifies the Golgi and slows the
enzyme. We tested it *in silico* with a literature-parameterized bioreactor-to-
Golgi glycan model (no data fitting), driven by an agentic experiment loop. From bench to
manufacturing, dissolved CO₂ climbs from ~60 to ~74 mmHg, yet galactosylation stays **robust**
(+1 point): Golgi pH straddles the enzyme's pH optimum (~6.4) where its activity curve is flat,
and oxygen has no effect. The implication: **to hold glycan quality at scale, engineer the
clone and the media — not the gas strategy.**

Every result is reproducible and grounded in public literature. GlycoTwin is a single-file,
zero-install twin spanning antibody to process to quality to control, with a governed agent loop
and a skill that recalibrates it to any molecule.
