"""Model service — the single source of truth.

Imports the reference Python model (cho_cqa_model.py) directly and exposes the
computations the app needs. No JS port, no fixture sync: the physics lives in
exactly one place.
"""
from __future__ import annotations
import sys, os, math
from typing import Any

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.abspath(os.path.join(_HERE, ".."))
for p in (os.path.join(_ROOT, "model"), _ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

import numpy as np
import cho_cqa_model as cm

GLYCO_KEYS = ("high_mannose", "afucosylation", "galactosylation", "sialylation", "G0F")

DEFAULT_KNOBS: dict[str, float] = {
    "kLa_CO2": 0.11, "pH_set": 7.05, "mu_max": 0.0265,
    "Fglc": 0.20, "Fgln": 0.035, "Fgal": 0.0, "asn_level": 1.0,
    "Tset": 37.0, "DO": 50.0, "Mn": 0.5,
    "MGAT": 1.0, "B4GALT": 1.0, "FUT8": 1.0, "ST6GAL": 1.0,
}


def _bio_params(k: dict[str, float]):
    p = cm.default_params()
    p["kLa_CO2"] = k["kLa_CO2"]; p["pH_set"] = k["pH_set"]; p["mu_max"] = k["mu_max"]
    p["Fglc"] = k["Fglc"]; p["Fgln"] = k["Fgln"]; p["Fgal"] = k["Fgal"]
    return p


def _glyco_state(k, Glc, Gln, Gal_ext, pCO2, mu):
    """Assemble the state dict glycosylation_cqa expects: nucleotide pools +
    gene multipliers + cofactor + residence inputs. Gene effects enter via
    state (MGAT/B4GALT/FUT8/ST6GAL), exactly as the reference model does."""
    pools = cm.nucleotide_pools(Glc, Gln, Gal_ext, asn_level=k["asn_level"], DO=k["DO"])
    tau_f = math.exp(-0.045 * (k["Tset"] - 37.0))  # temperature -> residence
    return {
        "pCO2": pCO2, "mu": max(mu, 0.0), "Mn": k["Mn"],
        "MGAT": k["MGAT"], "B4GALT": k["B4GALT"], "FUT8": k["FUT8"], "ST6GAL": k["ST6GAL"],
        **pools, "_tau_f": tau_f,
    }


def simulate(knobs: dict[str, float], days: int = 13) -> dict[str, Any]:
    k = {**DEFAULT_KNOBS, **(knobs or {})}
    p = _bio_params(k)
    gp = cm.golgi_params(); gp["pH_set"] = k["pH_set"]
    gp_tau = dict(gp); gp_tau["tauG"] = gp["tauG"] * math.exp(-0.045 * (k["Tset"] - 37.0))
    sol = cm.run_bioreactor(p, days=days)
    t = sol.t  # hours
    Xv, Glc, Gln, Lac, Amm, mAb, pCO2, V, Gal = sol.y
    n = len(t)
    cqaT = {key: [] for key in GLYCO_KEYS}; pH_golgi = []
    dmab = np.zeros(n)
    for i in range(n):
        i0, i1 = max(0, i - 1), min(n - 1, i + 1)
        dt_h = t[i1] - t[i0]
        mu = (math.log(max(Xv[i1], 1e-9)) - math.log(max(Xv[i0], 1e-9))) / dt_h if dt_h > 0 else 0.0
        st = _glyco_state(k, Glc[i], Gln[i], Gal[i], pCO2[i], mu)
        _, cqa = cm.glycosylation_cqa(st, gp_tau)
        for key in GLYCO_KEYS:
            cqaT[key].append(float(cqa[key]))
        pH_golgi.append(float(cqa["pH_golgi"]))
        dmab[i] = max((mAb[i1] - mAb[i0]) / dt_h, 0.0)
    w = dmab / dmab.sum() if dmab.sum() > 0 else np.ones(n) / n
    harvest = {key: float(np.dot(w, cqaT[key])) for key in GLYCO_KEYS}
    return {
        "t_hours": t.tolist(),
        "Xv": Xv.tolist(), "Glc": Glc.tolist(), "Gln": Gln.tolist(),
        "Lac": Lac.tolist(), "Amm": Amm.tolist(), "mAb": mAb.tolist(),
        "pCO2": pCO2.tolist(), "pH_golgi": pH_golgi, "cqaT": cqaT,
        "harvest": harvest,
        "titer": float(mAb[-1]), "peakVCD": float(Xv.max()), "pCO2max": float(pCO2.max()),
    }


def harvest_cqa(knobs: dict[str, float], days: int = 13) -> dict[str, float]:
    return simulate(knobs, days=days)["harvest"]


def sensitivity(knobs, cqa: str = "galactosylation", frac: float = 0.15):
    base = {**DEFAULT_KNOBS, **(knobs or {})}
    base_val = harvest_cqa(base)[cqa]
    out = []
    for key in ("kLa_CO2", "pH_set", "mu_max", "Fglc", "Fgln", "Fgal",
                "asn_level", "Tset", "DO", "Mn", "MGAT", "B4GALT", "FUT8", "ST6GAL"):
        hi = dict(base); hi[key] = base[key] * (1 + frac) if base[key] else frac
        lo = dict(base); lo[key] = base[key] * (1 - frac) if base[key] else -frac
        vhi = harvest_cqa(hi)[cqa]; vlo = harvest_cqa(lo)[cqa]
        out.append({"knob": key, "low": vlo, "high": vhi, "delta": abs(vhi - vlo)})
    out.sort(key=lambda d: d["delta"], reverse=True)
    return {"cqa": cqa, "base": base_val, "effects": out}
