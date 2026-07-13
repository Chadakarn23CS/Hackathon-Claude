import numpy as np

GLYCO_KEYS = ("high_mannose", "afucosylation", "galactosylation", "sialylation", "G0F")


def harvest_with_gp(model, gp, Mn=0.5, days=13):
    """Production-weighted harvest CQA for a given Golgi-params dict `gp`."""
    p = model.default_params()
    sol = model.run_bioreactor(p, days=days)
    t = sol.t
    Xv, Glc, Gln, Gal = sol.y[0], sol.y[1], sol.y[2], sol.y[8]
    mAb, pCO2 = sol.y[5], sol.y[6]
    mu = np.clip(np.gradient(np.log(np.clip(Xv, 1e-3, None)), t) + p["mu_d"], 0, p["mu_max"])
    dm = np.gradient(mAb, t)
    dm[dm < 0] = 0
    w = dm / (dm.sum() + 1e-9)
    acc = {k: 0.0 for k in GLYCO_KEYS}
    for i in range(len(t)):
        pools = model.nucleotide_pools(Glc[i], Gln[i], Gal[i])
        st = dict(pCO2=pCO2[i], mu=mu[i], Mn=Mn, MGAT=1, B4GALT=1, FUT8=1, ST6GAL=1, **pools)
        c = model.glycosylation_cqa(st, gp)
        cc = c[1] if isinstance(c, tuple) else c
        for k in GLYCO_KEYS:
            acc[k] += w[i] * cc[k]
    return {k: float(v) for k, v in acc.items()}


def harvest_cqa(model, Mn=0.5, days=13):
    """Production-weighted harvest CQA for the model's default Golgi params."""
    return harvest_with_gp(model, model.golgi_params(), Mn=Mn, days=days)


def calibrate(model, target, Mn=0.5, knobs=("k_gal", "k_fut", "k_sia"), days=13):
    """Least-squares fit named Golgi rate constants to a target harvest CQA.

    target: dict mapping CQA name -> percent (e.g. {"galactosylation": 62}).
    knobs:  Golgi-params keys to vary. Default three move gal/afuc/sia; add
            "k_gnt" to also move high_mannose.
    Returns {fitted, achieved, cost, golgi_params}.
    """
    from scipy.optimize import least_squares

    base = model.golgi_params()
    tkeys = list(target.keys())
    x0 = [base[k] for k in knobs]
    lo = [0.0] * len(knobs)
    hi = [2.0 if k == "k_fut" else 0.5 for k in knobs]

    def resid(x):
        gp = dict(base)
        for k, v in zip(knobs, x):
            gp[k] = v
        h = harvest_with_gp(model, gp, Mn=Mn, days=days)
        return [h[k] - target[k] for k in tkeys]

    sol = least_squares(resid, x0, bounds=(lo, hi), max_nfev=120)
    gp = dict(base)
    for k, v in zip(knobs, sol.x):
        gp[k] = float(v)
    h = harvest_with_gp(model, gp, Mn=Mn, days=days)
    return {
        "fitted": {k: float(v) for k, v in zip(knobs, sol.x)},
        "achieved": {k: round(h[k], 2) for k in tkeys},
        "cost": float(sol.cost),
        "golgi_params": gp,
    }
