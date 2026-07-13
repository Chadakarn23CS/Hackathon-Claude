---
name: cho-cqa-recalibrate
description: Recalibrate and rebuild the CHO Glyco-CQA Studio digital twin from a new fed-batch + N-glycan dataset. Use when a user has product-specific or cell-line-specific glycan CQA targets (galactosylation, afucosylation, sialylation, high-mannose, G0F) and wants the mechanistic Golgi model refit to reproduce them, the JS engine fixtures regenerated, and the single-file app rebuilt. Covers loading the reference model modules, least-squares fitting of Golgi rate constants to a target harvest CQA profile, and the regenerate-fixtures/rebuild loop.
---

# CHO CQA Studio — recalibrate from a dataset

The CHO Glyco-CQA Studio is a mechanistic digital twin: a fed-batch bioreactor
ODE feeds a Golgi enzyme-train that predicts N-glycan CQAs. Out of the box it is
calibrated to a canonical G0F-dominant IgG1 Fc. This skill refits it to a
**specific product or cell line** given that molecule's measured harvest CQA
profile, then regenerates the JS test fixtures and rebuilds the app.

## When to use
- A user brings a CHO fed-batch dataset with measured N-glycan percentages
  (galactosylation, afucosylation, sialylation, high-mannose, G0F).
- They want the twin to reproduce *their* numbers, not the reference profile.
- They then want the production JS app rebuilt against the recalibrated engine.

## Inputs you need from the user
1. **Target harvest CQA profile** — at minimum galactosylation; ideally also
   afucosylation and sialylation (%). High-mannose and G0F optional.
2. **Culture context** (optional) — Mn2+ level, DO, temperature if non-standard.
3. Location of the reference modules `cho_cqa_model.py` and (for the PFR variant)
   `golgi_pfr.py`. If absent from the workspace, restore them from their
   artifacts with `host.artifact_path(version_id)`.

## Workflow

### 1. Load the reference model
Ensure `cho_cqa_model.py` is importable (`sys.path.insert(0, '.')`). Its API:
`default_params()`, `golgi_params()`, `run_bioreactor(p, days=13)`,
`nucleotide_pools(Glc, Gln, Gal_ext, asn_level=1.0, DO=50.0)`,
`glycosylation_cqa(state, p)`.

### 2. Compute the current harvest CQA
Call `harvest_cqa(cho_cqa_model, Mn=...)` (shipped in this skill's kernel).
It runs the bioreactor, computes growth-rate mu by d(ln Xv)/dt, and returns the
production-weighted harvest CQA dict — the same weighting the app uses. Report
the baseline so the user sees the starting point.

### 3. Fit Golgi rate constants to the target
Call `calibrate(cho_cqa_model, target, Mn=..., knobs=('k_gal','k_fut','k_sia'))`.
It least-squares-fits the named Golgi rate constants so the production-weighted
harvest matches `target` (a dict of CQA -> percent). Returns
`{fitted, achieved, cost, golgi_params}`. The default three knobs move
galactosylation / afucosylation / sialylation respectively; add `'k_gnt'` to
also move high-mannose. Fitting is bounded and typically hits the target to
<0.1% when the profile is physically reachable.

### 4. Persist the recalibrated params
Write the fitted `golgi_params` back into `cho_cqa_model.py` (the
`golgi_params()` return dict) and mirror the same numbers into the TS engine
(`cqa-studio/src/model/engine.ts`, `defaultGlyParams()`). Keep the Python
reference and the TS engine identical — the test suite enforces this.

### 5. Regenerate fixtures and rebuild
Regenerate `cqa-studio/src/model/__tests__/fixtures.json` from the recalibrated
`cho_cqa_model.py` (13 scenarios: baseline + knob perturbations), then in the
`nodejs` env run `npm test` (expect 36 pass) and `npm run build`. Copy
`dist/index.html` to `cqa_studio_app.html` and `save_artifacts` as a new version.

### 6. Report
State baseline -> achieved CQA, the fitted constants, the worst JS-vs-Python
fixture error, and that the tool is now calibrated to the user's product.
Always caveat: the fit is only as good as the input data; a profile the network
cannot physically produce will show non-zero residual.

## Helper (auto-loaded from kernel.py)
- `harvest_cqa(model_module, Mn=0.5, days=13)` -> harvest CQA dict
- `harvest_with_gp(model_module, gp, Mn=0.5, days=13)` -> harvest CQA for a specific Golgi-params dict
- `calibrate(model_module, target, Mn=0.5, knobs=('k_gal','k_fut','k_sia'), days=13)`
  -> `{fitted, achieved, cost, golgi_params}`
