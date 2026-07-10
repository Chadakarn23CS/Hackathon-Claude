# GlycoTwin — how it helps antibody drug development

**The core shift:** it moves glycan-CQA decisions *upstream* — from "measure it after the
run and hope" to "predict it, design for it, and control it." Glycan CQAs set the drug's
efficacy and safety, so getting them right early de-risks the whole CMC package.

## Why the glycan matters for the *drug* (not just the molecule)

| CQA | Clinical consequence | Development lever |
|---|---|---|
| Afucosylation | ADCC potency (cell-killing — oncology mAbs) | FUT8 knockdown |
| Galactosylation | CDC potency + lot-to-lot consistency | B4GALT1, Mn²⁺, galactose feed |
| Sialylation | Half-life, anti-inflammatory character | ST6GAL1, DO, precursor supply |
| High mannose | Faster clearance (PK liability to minimize) | asparagine / precursor supply, residence time |

## Phase-by-phase value (numbers from the model)

Baseline harvest profile: galactosylation 53%, afucosylation 3%, sialylation 5%, high-mannose 1%.

1. **Cell-line development / clone selection — Cell Biology (genome sliders).**
   Screen genotype edits in silico before building clones. FUT8 knockdown → afucosylation
   3 → 37% (ADCC-enhanced clone). B4GALT1 overexpression → galactosylation 53 → 84%.
   Prioritize which clones to physically build instead of screening blind.

2. **Early process development — Sensitivity tab.**
   Tornado ranking shows which 2–3 process parameters actually move each CQA, so the
   physical DOE is smaller and cheaper than screening 10 factors.

3. **Process characterization (QbD / ICH Q8) — Design Space tab.**
   Sweep any two parameters; read off the operating region where a CQA stays in spec —
   a mechanistically-justified design space for the filing, not a purely empirical one.

4. **Scale-up / tech transfer — Process Control / CO₂ sliders.**
   CO₂ stripping (kLa) is the one parameter that genuinely changes with reactor scale
   (a large tank strips CO₂ less efficiently). The model predicts CQA and titer drift from
   bench to manufacturing scale before the first large run — the classic tech-transfer risk.

5. **Control strategy (ICH Q10 / Q11) — Process Control (PID) tab.**
   Answers "which CPP do I control, to what setpoint, to hold this CQA?" Manipulating CO₂
   stripping to hold pCO₂ (→ Golgi pH → galactosylation) is a real, actuatable control loop.
   Shows the galactosylation-vs-titer tradeoff a control strategy must balance.

6. **Comparability / biosimilarity — Agent Optimize + recalibrate skill.**
   Refit the twin to a target product's measured glycan profile, then search for the process
   that reproduces it — e.g. "what conditions hit the originator's galactosylation/sialylation?"

7. **Manufacturability / robustness — Robustness (Cpk) tab.**
   Monte-Carlo the operating point with realistic run-to-run variability → capability index.
   Answers "will this stay in spec at commercial scale?" before the process is locked.

## Honest scope
This is **literature-parameterized decision-support**, not a validated release assay. It is
strongest for *direction and mechanism* — which lever, which way, roughly how much — and for
compressing physical experiments. Quantitative claims for a specific product require
calibrating the twin against that product's fed-batch + glycan data (the recalibrate skill
automates this). Use it to decide *what to run*, then confirm with the wet-lab work it
replaces some of.
