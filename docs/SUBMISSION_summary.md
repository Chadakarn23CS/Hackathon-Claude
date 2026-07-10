# Written summary (194 words)

**GlycoTwin — a mechanistic digital twin for antibody glycosylation**

Antibody quality attributes like galactosylation and sialylation are set inside the
Golgi, but process engineers can only touch the bioreactor. GlycoTwin closes that gap:
a 9-state fed-batch CHO bioreactor ODE feeds an ER→Golgi enzyme-train, so moving a reactor
knob propagates all the way to the secreted N-glycan on IgG1's Fc. Glycosylation is driven
by its two real levers — Golgi enzymes and nucleotide-sugar donors — both explicit in the
engine.

Starting from a concrete question — *do scale-dependent CO₂/pH/transit-time gradients shift
glycan CQAs?* — we grounded the model in public datasets (CHOGlycoNET, a CSBJ anti-Her2
study, a 2026 *mAbs* meta-analysis) and reproduced the literature's <5% pH/DO/CO₂ ceiling
blind. The single-file app runs the whole molecule→process→CQA→control chain: a real IgG1
domain map, an interactive CHO-cell schematic, live simulation, a data-assimilating batch
monitor, ICH-Q8 design space with NOR/PAR, sensitivity with two-factor interactions,
Monte-Carlo robustness, a PID controller that holds pCO₂ with a disturbance-rejection demo,
scale-up gas strategy, and a governed agent-optimization loop. A published Claude Science
skill recalibrates the twin to any product in three calls. The engine reproduces its Python
reference to ≤0.17% (36 automated tests).
