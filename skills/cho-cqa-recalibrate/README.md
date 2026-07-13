# cho-cqa-recalibrate — Claude Science skill

This folder is the open-source copy of the **cho-cqa-recalibrate** skill referenced
in the app's Guide tab. It recalibrates the GlycoTwin mechanistic model to a
*specific* product or cell line from that molecule's measured harvest N-glycan
profile, then regenerates the JS fixtures and rebuilds the single-file app.

## What's here
- `SKILL.md` — the skill definition (when to use, inputs, workflow).
- `kernel.py` — helper functions loaded into the kernel: `calibrate`, `harvest_cqa`,
  `harvest_with_gp`, `GLYCO_KEYS`.

## How it's used
The skill runs inside **Claude Science** (the environment this project was built in).
A user with their own fed-batch + glycan data loads the skill, supplies the target
CQA percentages, and the `calibrate` helper least-squares-fits the Golgi rate
constants (`k_gal`, `k_fut`, `k_sia`, …) so the twin reproduces their molecule.

## Why calibration data is NOT in this repo
The public build is calibrated to a canonical, literature-derived IgG1 Fc profile —
no proprietary data. Product-specific recalibration happens **locally on the user's
own dataset** and is never committed here. That keeps the open build free of any
proprietary or product-specific information while still shipping the mechanism that
does the fitting, so the method is fully reproducible.
