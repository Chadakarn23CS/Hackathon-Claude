#!/usr/bin/env bash
# One-command reproduction of the scale-up galactosylation finding.
# Public data + mechanistic model only; no proprietary data, no ML.
set -e
cd "$(dirname "$0")/.."
python3 -m venv .venv 2>/dev/null || true
. .venv/bin/activate
pip install -q numpy scipy matplotlib
echo "== deterministic analysis =="; python research/scale_up_finding.py
echo "== agentic reproduction =="; python research/agent_research.py
echo "Done. See research/results.json, research/agent_run.json, research/figs/*.png"
