# GlycoTwin — a mechanistic digital twin for antibody glycosylation

GlycoTwin connects the **bioreactor knob** an engineer can touch to the **N-glycan quality
attribute** set inside the Golgi. A 9-state fed-batch CHO bioreactor ODE feeds an ER→Golgi
enzyme-train, so moving a process parameter propagates all the way to the secreted IgG1 Fc
glycan (galactosylation, afucosylation, sialylation, high-mannose).

Glycosylation is driven by its two real control levers — **Golgi enzymes** and
**nucleotide-sugar donors** — and both are explicit in the model.

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
| `docs/` | Biology scope, scale-up strategy, novelty, drug-development value, submission materials |
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

## Related work
GlycoPy (Ma, Guo & Braatz, MIT — *Comput. Chem. Eng.* 2026) is a recent CasADi-based Python
framework for hierarchical modeling and **NMPC** of the same CHO mAb-glycosylation problem. It
agrees on the drivers of Golgi glycosylation (enzyme, nucleotide-sugar donor, Mn²⁺ cofactor),
though at higher kinetic fidelity — GlycoPy uses enzyme-specific Bi-Bi rate laws where GlycoTwin
uses a reduced Michaelis form. The two are complementary: GlycoPy is a research modeling/NMPC toolkit;
GlycoTwin is an interactive, explainable, zero-install decision tool. Full comparison and adopted
improvements: [`docs/RELATED_WORK_GlycoPy.md`](docs/RELATED_WORK_GlycoPy.md).

## License
MIT — see [LICENSE](LICENSE).
