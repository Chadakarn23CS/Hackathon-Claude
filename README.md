# GlycoTwin — a mechanistic digital twin for antibody glycosylation

GlycoTwin connects the **bioreactor knob** an engineer can touch to the **N-glycan quality
attribute** set inside the Golgi. A 9-state fed-batch CHO bioreactor ODE feeds an ER→Golgi
enzyme-train, so moving a process parameter propagates all the way to the secreted IgG1 Fc
glycan (galactosylation, afucosylation, sialylation, high-mannose).

Glycosylation is driven by its two real control levers — **Golgi enzymes** and
**nucleotide-sugar donors** — and both are explicit in the model.

## The biology, and why a mechanistic model
The engine encodes a single multiplicative activity law:
**enzyme activity = expression × pH-factor × Mn²⁺-cofactor × substrate(Michaelis)**, with
conversion at each step `= 1 − exp(−activity · τ)` over the Golgi residence time τ. The two
levers are:
1. **Enzymes** — the glycosyltransferases (MGAT, B4GALT1, FUT8, ST6GAL1). Moved by expression,
   Golgi-lumen pH (each enzyme has its own optimum), the Mn²⁺ cofactor, and residence time.
2. **Nucleotide-sugar donors** — UDP-GlcNAc, UDP-Gal, GDP-Fuc, CMP-NeuAc, fed by central
   metabolism (glucose / glutamine / asparagine). A fully-active enzyme adds nothing if its
   donor pool is empty; either lever at zero shuts a step down.

The network is **sequential and branched** — GlcNAc antenna → galactose → sialic acid, with core
fucose a parallel branch, and each step gated by the one before it. You steer a whole competing
distribution under one transit time, so terminal features are coupled and non-obvious. That
step-gated coupling is exactly what a mechanistic model captures and a look-up table or pure ML
correlation does not.

## Run it

**Offline (no install):** open `glycotwin_app.html` in any browser. Every tab works except the
server-side agent proposer.

**Full stack (adds the LLM agent proposer):**
```bash
cd glycotwin-server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-…      # optional; omit for deterministic agent mode
uvicorn app.main:app --port 8000
```
Then open http://localhost:8000. See `glycotwin-server/QUICKSTART.md` for Docker + smoke tests.

**Build the single-file app from source:**
```bash
cd cqa-studio && npm install && npm test && npm run build
```

## What's inside

| Path | What |
|---|---|
| `glycotwin_app.html` | The built single-file app (offline deliverable) |
| `cqa-studio/` | TypeScript/React source + Vitest suite (36 tests) |
| `glycotwin-server/` | FastAPI backend; imports the Python model directly as the single source of truth |
| `model/` | `cho_cqa_model.py` (bioreactor + glyco reference) and `golgi_pfr.py` |
| `docs/` | Parameter provenance, GlycoPy related-work comparison, written submission summary |
| `references/` | Citation metadata (RIS / BibTeX / table) for the parameterizing literature |

## The tool (12 views)
Workflow · Antibody Molecule (real IgG1 domains + 3D) · Cell Biology (ER→Golgi schematic) ·
Live Simulation (incl. nucleotide-sugar donor pools) · Batch Monitor (data-assimilating twin) ·
Sensitivity (tornado + two-factor interactions) · Design Space (ICH-Q8, NOR/PAR) ·
Process Control (PID on pCO₂ + disturbance rejection) · Robustness (Monte-Carlo Cpk) ·
Scale-Up (CO₂-stripping gas strategy) · Agent Optimize (governed Proposer→Evaluator→Critic loop) ·
How to Use.

## Provenance & scope
- Parameterized **entirely from public, published sources** (CHOGlycoNET, Jimenez del Val 2011,
  Villiger 2016, a CSBJ anti-HER2 study, a 2026 *mAbs* meta-analysis). See `references/`.
  Papers are cited by DOI; no copyrighted PDFs are redistributed here.
- Contains **no proprietary or company-specific data**. Product-specific calibration happens
  locally via the `cho-cqa-recalibrate` Claude Science skill and is never included in this build.
- Models **N-linked glycosylation** of the IgG1 Fc glycan (Asn297). O-glycosylation is out of scope.
- The JavaScript engine reproduces its Python reference to ≤0.17% (36 automated tests).
- Every parameter and mechanism is traced to its source in [`docs/PARAMETER_PROVENANCE.md`](docs/PARAMETER_PROVENANCE.md).

## Where it fits in antibody drug development
The core shift is moving glycan-CQA decisions **upstream** — from "measure after the run and hope"
to "predict, design for, and control." Each CQA is a clinical lever with a development handle:

| CQA | Clinical consequence | Development lever |
|---|---|---|
| Afucosylation | ADCC potency (cell-killing — oncology mAbs) | FUT8 knockdown |
| Galactosylation | CDC potency + lot-to-lot consistency | B4GALT1, Mn²⁺, galactose feed |
| Sialylation | Half-life, anti-inflammatory character | ST6GAL1, DO, precursor supply |
| High mannose | Faster clearance (PK liability) | asparagine / precursor supply, residence time |

Concrete in-silico moves (from the model): FUT8 knockdown → afucosylation 3 → 37% (an
ADCC-enhanced clone); B4GALT1 overexpression → galactosylation 53 → 84%. So the twin supports
clone prioritization (Cell Biology genome sliders), parameter ranking (Sensitivity), a filing-ready
design space (Q8 NOR/PAR), and a control strategy (PID on pCO₂) — the CMC arc, in one tool.

**Scale-up framing:** the tool treats scale-up for glycan quality as a **CO₂-stripping problem
disguised as an oxygen-transfer problem** — holding DO constant does not hold pCO₂ constant, and
it is pCO₂ (→ carbonic acid → Golgi-lumen pH) that primarily moves the Fc glycan. CO₂ removal, not
O₂ supply, is what fails first at large scale.

## What's novel
A 2021–2026 literature scan shows the pieces exist in **siloed** clusters — Golgi reaction-network
models (usually offline, code-only), bioprocess digital twins (that rarely include glycosylation),
mAb-glycosylation QbD frameworks, and a little AI-in-bioprocess work (that mostly doesn't touch
glycans). GlycoTwin's contribution is the **integration**: a single interactive, mechanistic,
agent-augmented twin running the whole molecule → CQA → control chain for antibody glycosylation,
explainable and zero-install — a combination the current literature does not offer as one tool.

## Related work
GlycoPy (Ma, Guo & Braatz, MIT — *Comput. Chem. Eng.* 213:109726, 2026;
[doi:10.1016/j.compchemeng.2026.109726](https://doi.org/10.1016/j.compchemeng.2026.109726)) is a recent CasADi-based Python
framework for hierarchical modeling and **NMPC** of the same CHO mAb-glycosylation problem. It
agrees on the drivers of Golgi glycosylation (enzyme, nucleotide-sugar donor, Mn²⁺ cofactor),
though at higher kinetic fidelity — GlycoPy uses enzyme-specific Bi-Bi rate laws where GlycoTwin
uses a reduced Michaelis form. The two are complementary: GlycoPy is a research modeling/NMPC toolkit;
GlycoTwin is an interactive, explainable, zero-install decision tool. Full comparison and adopted
improvements: [`docs/RELATED_WORK_GlycoPy.md`](docs/RELATED_WORK_GlycoPy.md).

## License
Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE). Apache-2.0 adds an explicit
patent grant and patent-retaliation clause on top of permissive reuse, and requires that the
attribution notices travel with any redistribution.

## Citation
If you use GlycoTwin, please cite it — see [CITATION.cff](CITATION.cff) (GitHub renders a
"Cite this repository" button). Author: Chadakarn Sirasitthichoke.
