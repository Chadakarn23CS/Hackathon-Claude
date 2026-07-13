"""Drift guard: the server model must reproduce the frozen fixtures.

The FastAPI backend ships its own copy of the physics (model/cho_cqa_model.py,
imported via model_service). The offline app validates a TypeScript port of the
same physics against cqa-studio/src/model/__tests__/fixtures.json. This test
closes the loop: it drives model_service across the SAME 13 scenarios and
asserts the server harvest matches those fixtures, so the two copies can never
silently diverge again (see the ammonia-coupling / mu drift fixed previously).

Runs standalone (`python tests/test_fixture_parity.py`) or under pytest.
"""
from __future__ import annotations
import json, os, sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_SRV = os.path.abspath(os.path.join(_HERE, ".."))
if _SRV not in sys.path:
    sys.path.insert(0, _SRV)

from app import model_service as ms  # noqa: E402

_FIXTURES = os.path.join(_SRV, "..", "cqa-studio", "src", "model", "__tests__", "fixtures.json")

# Scenario -> knob overrides, mirroring gen_fixtures.py::scenario(). Every override
# the reference generator applies is expressible through the public knob surface.
SCENARIO_KNOBS: dict[str, dict[str, float]] = {
    "baseline": {},
    "low_strip": {"kLa_CO2": 0.06},
    "high_strip": {"kLa_CO2": 0.25},
    "Mn4x": {"Mn": 2.0},
    "gal_feed": {"Fgal": 0.15},
    "fut8_kd": {"FUT8": 0.3},
    "st6_up": {"ST6GAL": 4.0},
    "alkaline": {"pH_set": 7.3},
    "low_growth": {"mu_max": 0.020},
    "rich_feed": {"Fglc": 0.5, "Fgln": 0.10},
    "asn_low": {"asn_level": 0.2},
    "do_low": {"DO": 15.0},
    "temp_shift": {"Tset": 33.0},
}

TOL = 0.01  # % absolute; server should reproduce the reference to well under this


def _load_fixtures() -> dict:
    with open(_FIXTURES) as fh:
        return json.load(fh)["fixtures"]


def test_server_model_reproduces_fixtures() -> None:
    fixtures = _load_fixtures()
    worst = 0.0
    for name, knobs in SCENARIO_KNOBS.items():
        want = fixtures[name]["harvest"]
        got = ms.harvest_cqa(knobs)
        for cqa, wv in want.items():
            gv = got[cqa]
            diff = abs(gv - wv)
            worst = max(worst, diff)
            assert diff < TOL, (
                f"{name}.{cqa}: server={gv:.4f} fixture={wv:.4f} diff={diff:.4f} "
                f"(server model has drifted from the frozen reference)"
            )
    print(f"OK: server model matches all {len(SCENARIO_KNOBS)} fixtures, worst abs diff {worst:.5f}")


if __name__ == "__main__":
    test_server_model_reproduces_fixtures()
