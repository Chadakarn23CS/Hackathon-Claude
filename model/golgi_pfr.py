"""
golgi_pfr.py
============
Plug-flow-reactor (PFR) model of monoclonal-antibody N-linked glycosylation in a
maturing Golgi apparatus, with an extracellular pH / Mn(2+) / galactose extension.

This is an INDEPENDENT re-implementation written from the EQUATIONS described in:

  [1] Jimenez del Val I., Nagy J.M., Kontoravdi C. (2011).
      "A dynamic mathematical model for monoclonal antibody N-linked glycosylation
       and nucleotide sugar donor transport within a maturing Golgi apparatus."
      Biotechnology Progress 27(6): 1730-1743. doi:10.1002/btpr.688
      -> Golgi-as-PFR with cisternal maturation; Michaelis-Menten glycosyltransferase
         kinetics with nucleotide-sugar-donor (NSD) co-substrate; enzyme and
         transport-protein concentration profiles along the Golgi length.

  [2] Villiger T.K., Scibona E., Stettler M., Broly H., Morbidelli M., Soos M. (2016).
      "Controlling the time evolution of mAb N-linked glycosylation, Part I & Part II."
      Biotechnology Progress 32(5): 1123-1148. doi:10.1002/btpr.2305 / 10.1002/btpr.2315
      -> Extension of the glycosylation model as a function of extracellular pH,
         manganese and galactose addition, coupling media conditions to the
         intracellular nucleotide-sugar pools and transferase activities.

No source code from either work was consulted or copied; only the governing
equations as described in the papers were used. Kinetic and enzyme-distribution
parameters here are literature-directed, order-of-magnitude values chosen to
reproduce a canonical IgG1 Fc glycan profile; they are NOT the exact fitted
parameters of either paper (which are not reproduced here) and require
recalibration for any specific cell line / product.

--------------------------------------------------------------------------------
GOVERNING EQUATIONS
--------------------------------------------------------------------------------
Golgi as a plug-flow reactor (steady state, cisternal maturation). A cohort of
protein-bound oligosaccharides is convected from the cis face (z=0) to the trans
face (z=L). With Golgi volumetric flow Q [L/cell/h] and cross-sectional area
A [dm^2], the axial (steady-state) balance for oligosaccharide species i is

        dO_i/dz = (A / Q) * sum_r ( nu_{i,r} * R_r(z) )                     (Eq. 1)

Using normalized axial coordinate x = z/L in [0,1] and residence time
tau = L*A/Q [h] (the mean Golgi transit time), Eq. 1 becomes the residence-time
form actually integrated here:

        dO_i/dx = tau * sum_r ( nu_{i,r} * R_r(x) )                         (Eq. 2)

with sum_i O_i(x) = O_tot conserved (protein carrier is conserved; only the
attached glycan changes). O_i are expressed as fractions (O_tot = 1).

Reaction rate for glycosyltransferase reaction r (transfer of a sugar from
nucleotide-sugar donor NSD_r onto oligosaccharide substrate s(r)), sequential
bi-substrate Michaelis-Menten with competitive inhibition by the released
nucleotide (UDP/CMP/GDP), following [1]:

  R_r(x) = kcat_r * E_r(x) * f_pH(pH_g) * f_cof_r(Mn)
           * [O_{s(r)}] / (Km_os,r + [O_{s(r)}])
           * [NSD_r]   / (Km_nsd,r * (1 + [Nuc_r]/Ki_r) + [NSD_r])          (Eq. 3)

Enzyme concentration profile along the Golgi (localization of each enzyme to a
region of the cisternal stack), represented as a Gaussian in x per [1]:

  E_r(x) = Emax_r * exp( -(x - mu_r)^2 / (2*sigma_r^2) )                    (Eq. 4)

Nucleotide-sugar-donor transport from cytosol to Golgi lumen (antiporter with the
corresponding nucleotide monophosphate), quasi-steady-state luminal level [1]:

  [NSD_r]_lumen = NSD_cyt_r * V_tp,r / (Ktp,r + V_tp,r)   (saturable import)  (Eq. 5)

pH dependence of transferase activity (bell-shaped optimum), Villiger [2]:

  f_pH(pH_g) = exp( -(pH_g - pH_opt)^2 / (2*sigma_pH^2) )                   (Eq. 6)

Golgi luminal pH as a function of extracellular / setpoint pH (the Golgi is
acidified relative to the cytosol/medium), linearized [2]:

  pH_g = (pH_ext - dpH0) - k_pCO2 * max(pCO2 - pCO2_ref, 0)                 (Eq. 7)

Mn(2+) cofactor dependence of the Mn-requiring transferases (GalT, GnTs),
saturable activation, Villiger [2]:

  f_cof_r(Mn) = a0_r + (1 - a0_r) * [Mn] / (K_Mn,r + [Mn])                  (Eq. 8)

Galactose feeding raises the UDP-Gal cytosolic pool that feeds Eq. 5 for GalT [2]:

  NSD_cyt_UDPGal = base_UDPGal + k_gal * [Gal_ext]                         (Eq. 9)
--------------------------------------------------------------------------------
"""
from __future__ import annotations
import numpy as np
from dataclasses import dataclass, field
from scipy.integrate import solve_ivp

# ------------------------------------------------------------------ #
#  Glycan species and the IgG-Fc reaction network (reduced, canonical)
# ------------------------------------------------------------------ #
SPECIES = ["Man5", "Man4", "Man3", "GnGn0", "G0", "G0F",
           "G1", "G1F", "G2", "G2F", "G2S1", "G2FS1"]
IDX = {s: i for i, s in enumerate(SPECIES)}

@dataclass
class Reaction:
    name: str
    substrate: str
    product: str
    enzyme: str          # key into ENZYMES
    nsd: str             # nucleotide-sugar donor key
    nuc: str             # released nucleotide (product inhibitor)
    kcat: float          # 1/h (lumped with Emax scale)

# Canonical Fc maturation path:
#   Man5 -(ManII)-> Man4 -> Man3 -(GnTI/II)-> GnGn0 -(GnT done)-> G0
#   G0 -(FucT)-> G0F ; G0/G0F -(GalT)-> G1/G1F -> G2/G2F ; G2F -(SiaT)-> G2FS1
# kcat values are literature-directed, calibrated so that default GolgiParams()
# reproduces a canonical G0F-dominant IgG1 Fc profile (see module docstring).
REACTIONS = [
    Reaction("ManII_a", "Man5",  "Man4",  "ManII", "none",     "none", 4.5),
    Reaction("ManII_b", "Man4",  "Man3",  "ManII", "none",     "none", 4.5),
    Reaction("GnT",     "Man3",  "GnGn0", "GnT",   "UDPGlcNAc","UDP",  3.4),
    Reaction("toG0",    "GnGn0", "G0",    "GnT",   "UDPGlcNAc","UDP",  3.2),
    Reaction("Fuc0",    "G0",    "G0F",   "FucT",  "GDPFuc",   "GDP",  3.2),
    Reaction("Gal0",    "G0",    "G1",    "GalT",  "UDPGal",   "UDP",  0.20),
    Reaction("Gal0F",   "G0F",   "G1F",   "GalT",  "UDPGal",   "UDP",  0.20),
    Reaction("Gal1",    "G1",    "G2",    "GalT",  "UDPGal",   "UDP",  0.10),
    Reaction("Gal1F",   "G1F",   "G2F",   "GalT",  "UDPGal",   "UDP",  0.10),
    Reaction("Sia2F",   "G2F",   "G2FS1", "SiaT",  "CMPNeuAc", "CMP",  0.14),
    Reaction("Sia2",    "G2",    "G2S1",  "SiaT",  "CMPNeuAc", "CMP",  0.14),
]

# ---- Enzyme localization profiles along the Golgi (Eq. 4) ----
# mu in [0,1] = position of peak activity (cis=0 -> trans=1); sigma = spread.
@dataclass
class Enzyme:
    mu: float
    sigma: float
    Emax: float = 1.0
    mn_a0: float = 1.0        # 1 => no Mn dependence; <1 => Mn-activated (Eq. 8)
    K_Mn: float = 0.3
    ph_opt: float = 6.5       # (Eq. 6)
    sigma_ph: float = 0.6

ENZYMES = {
    #                mu   sigma Emax  mn_a0 K_Mn ph_opt sig_ph
    "ManII": Enzyme(0.18, 0.16, 1.0, 1.00, 0.3, 6.2, 0.7),
    "GnT":   Enzyme(0.40, 0.16, 1.0, 0.55, 0.3, 6.4, 0.6),   # GnTs are Mn-dependent
    "FucT":  Enzyme(0.46, 0.20, 1.0, 1.00, 0.3, 6.7, 0.7),
    "GalT":  Enzyme(0.72, 0.14, 1.0, 0.30, 0.4, 6.4, 0.6),   # strongly Mn-dependent
    "SiaT":  Enzyme(0.88, 0.11, 1.0, 0.60, 0.3, 6.2, 0.6),
}

@dataclass
class GolgiParams:
    tau: float = 40.0                 # mean Golgi transit time [h-equivalent] (Eq. 2)
    pH_ext: float = 7.05              # medium / setpoint pH (Eq. 7)
    dpH0: float = 0.55                # cis-Golgi acidification offset (Eq. 7)
    k_pCO2: float = 0.0045            # pH drop per mmHg pCO2 above ref (Eq. 7)
    pCO2: float = 40.0                # dissolved CO2 [mmHg]
    pCO2_ref: float = 40.0
    Mn: float = 0.3                   # relative Mn2+ level (Eq. 8)
    Gal_ext: float = 0.0              # galactose feed proxy (Eq. 9)
    # cytosolic NSD pools (relative) feeding luminal transport (Eq. 5)
    nsd_cyt: dict = field(default_factory=lambda: dict(
        UDPGlcNAc=1.0, UDPGal=1.0, GDPFuc=1.0, CMPNeuAc=1.0))
    k_gal: float = 3.0                # galactose -> UDP-Gal gain (Eq. 9)
    # transport (Eq. 5) and kinetics (Eq. 3)
    V_tp: float = 3.0
    Ktp: float = 1.0
    Km_os: float = 0.15
    Km_nsd: float = 0.4
    Ki_nuc: float = 5.0
    nuc_level: float = 0.3            # released-nucleotide level (product inhibition)

# ------------------------------------------------------------------ #
def golgi_pH(p: GolgiParams) -> float:
    """Eq. 7: Golgi luminal pH from medium pH and dissolved CO2."""
    return (p.pH_ext - p.dpH0) - p.k_pCO2 * max(p.pCO2 - p.pCO2_ref, 0.0)

def f_pH(pH_g: float, e: Enzyme) -> float:
    """Eq. 6: bell-shaped pH activity factor."""
    return np.exp(-((pH_g - e.ph_opt) ** 2) / (2 * e.sigma_ph ** 2))

def f_cof(Mn: float, e: Enzyme) -> float:
    """Eq. 8: Mn2+ cofactor activation."""
    return e.mn_a0 + (1 - e.mn_a0) * Mn / (e.K_Mn + Mn)

def E_profile(x: float, e: Enzyme) -> float:
    """Eq. 4: Gaussian enzyme concentration along Golgi coordinate x in [0,1]."""
    return e.Emax * np.exp(-((x - e.mu) ** 2) / (2 * e.sigma ** 2))

def nsd_lumen(p: GolgiParams) -> dict:
    """Eq. 5 (+ Eq. 9 for UDP-Gal): quasi-steady luminal nucleotide-sugar levels."""
    cyt = dict(p.nsd_cyt)
    cyt["UDPGal"] = cyt["UDPGal"] + p.k_gal * p.Gal_ext        # Eq. 9
    lum = {}
    for k, c in cyt.items():
        lum[k] = c * p.V_tp / (p.Ktp + p.V_tp)                 # Eq. 5 (saturable)
    lum["none"] = 1.0                                          # non-NSD steps
    return lum

def rhs(x: float, O: np.ndarray, p: GolgiParams, lum: dict, pH_g: float) -> np.ndarray:
    """Eq. 2/3: dO_i/dx = tau * sum_r nu_{i,r} R_r(x)."""
    dO = np.zeros_like(O)
    for rx in REACTIONS:
        e = ENZYMES[rx.enzyme]
        Osub = max(O[IDX[rx.substrate]], 0.0)
        # substrate (oligosaccharide) saturation
        sat_os = Osub / (p.Km_os + Osub)
        # NSD saturation with competitive product (nucleotide) inhibition (Eq. 3)
        if rx.nsd == "none":
            sat_nsd = 1.0
        else:
            nsd = lum[rx.nsd]
            sat_nsd = nsd / (p.Km_nsd * (1 + p.nuc_level / p.Ki_nuc) + nsd)
        rate = (rx.kcat * E_profile(x, e) * f_pH(pH_g, e) * f_cof(p.Mn, e)
                * sat_os * sat_nsd)
        flux = p.tau * rate * Osub          # first-order in substrate fraction
        dO[IDX[rx.substrate]] -= flux
        dO[IDX[rx.product]]   += flux
    return dO

def simulate_golgi(p: GolgiParams, n: int = 200):
    """Integrate the PFR from cis (x=0) to trans (x=1). Returns (x, O_matrix, cqa)."""
    O0 = np.zeros(len(SPECIES)); O0[IDX["Man5"]] = 1.0   # cohort enters as Man5
    lum = nsd_lumen(p); pH_g = golgi_pH(p)
    sol = solve_ivp(rhs, (0, 1), O0, args=(p, lum, pH_g),
                    t_eval=np.linspace(0, 1, n), method="LSODA",
                    rtol=1e-7, atol=1e-9)
    O = sol.y
    final = O[:, -1]
    frac = {s: float(final[IDX[s]]) for s in SPECIES}
    fuc = frac["G0F"] + frac["G1F"] + frac["G2F"] + frac["G2FS1"]
    gal = (frac["G1"] + frac["G1F"] + frac["G2"] + frac["G2F"]
           + frac["G2S1"] + frac["G2FS1"])
    man = frac["Man5"] + frac["Man4"] + frac["Man3"]
    sia = frac["G2S1"] + frac["G2FS1"]
    cqa = dict(high_mannose=100 * man, afucosylation=100 * (1 - fuc),
               fucosylation=100 * fuc, galactosylation=100 * gal,
               sialylation=100 * sia, G0F=100 * frac["G0F"], pH_golgi=pH_g)
    return sol.t, O, cqa

def scale_gradient_scan(pCO2_small=40.0, pCO2_large=90.0,
                        tau_small=40.0, tau_large=28.0,
                        pH_small=7.05, pH_large=6.95):
    """
    Compare a small-scale vs a larger stirred-tank microenvironment. Larger
    vessels typically accumulate dissolved CO2 (poorer stripping), may run a
    lower effective pH, and impose a shorter/altered Golgi transit through
    metabolic-rate changes. Returns per-CQA deltas (large - small).
    This is the intended coupling point for a CFD-derived microenvironment:
    replace the lumped (pCO2, pH, tau) here with CFD zone-averaged values.
    """
    small = simulate_golgi(GolgiParams(pCO2=pCO2_small, tau=tau_small, pH_ext=pH_small))[2]
    large = simulate_golgi(GolgiParams(pCO2=pCO2_large, tau=tau_large, pH_ext=pH_large))[2]
    keys = ["high_mannose", "afucosylation", "galactosylation", "sialylation", "G0F"]
    return {"small": {k: small[k] for k in keys + ["pH_golgi"]},
            "large": {k: large[k] for k in keys + ["pH_golgi"]},
            "delta": {k: large[k] - small[k] for k in keys}}

if __name__ == "__main__":
    base = GolgiParams()
    x, O, cqa = simulate_golgi(base)
    print("Golgi pH = %.2f" % cqa["pH_golgi"])
    print("Baseline CQA:", {k: round(v, 1) for k, v in cqa.items()})
    # scale-gradient scenario: poor CO2 removal -> higher pCO2 -> lower Golgi pH
    hi = simulate_golgi(GolgiParams(pCO2=110))[2]
    print("High pCO2 (110):", {k: round(v, 1) for k, v in hi.items()})
    lo = simulate_golgi(GolgiParams(Mn=1.5, Gal_ext=0.2))[2]
    print("Mn+Gal feed:", {k: round(v, 1) for k, v in lo.items()})
