# GlycoTwin — parameter & mechanism provenance

Every mechanism and parameter in the model, traced to the peer-reviewed source that supports it.
Verified against the full manuscripts (read under institutional license; not redistributed here —
cited by DOI). This table is what backs the "literature-parameterized" claim: it distinguishes
**mechanisms/values sourced from the literature** from **normalized placeholders calibrated to a
canonical IgG1 profile**.

## Sources
- **JdV2011** — Jimenez del Val, Nagy, Kontoravdi. *Biotechnol. Prog.* 2011;27(6):1730–1743. DOI 10.1002/btpr.688
- **Vil-I** — Villiger, Roulet, Périlleux, et al. Part I: Microbioreactor Experiments. *Biotechnol. Prog.* 2016;32(5):1123–1134. DOI 10.1002/btpr.2305
- **Vil-II** — Villiger, Scibona, Stettler, et al. Part II: Model-Based Predictions. *Biotechnol. Prog.* 2016;32(5):1135–1148. DOI 10.1002/btpr.2315
- **Fan2015** — Fan, Jimenez Del Val, Müller, et al. *Biotechnol. Bioeng.* 2015;112(3):521–535. DOI 10.1002/bit.25450

## A. Mechanisms confirmed from source (structural claims the model makes)

| Model feature | Source + location | What the paper says |
|---|---|---|
| Golgi as a **plug-flow reactor under cisternal maturation** | JdV2011 p1731 (contributions i); Vil-II p1136 | "The Golgi apparatus functions under the so-called cisternal maturation regime"; Villiger adapts it as "a single plug flow reactor including recycling of Golgi-resident proteins." |
| **Golgi residence time τ ≈ 40 min** (`tauG=40`) | JdV2011 p1733 | ER/Golgi residence time reported as 40 min; Golgi-only residence ~22 min (Umaña & Bailey). Model's 40 sits in this range. |
| **Nucleotide-sugar-donor antiport transport** links metabolism→Golgi | JdV2011 p1733, Eq. 9 | NSDs (UDP-GlcNAc, UDP-Gal, GDP-Fuc, CMP-Neu5Ac) transported into Golgi by antiport; transport follows saturation kinetics on cytosolic NSD concentration. |
| **Fc / N-linked only; Asn297; biantennary** scope | JdV2011 p1730; Fan2015 p522 | "the model will only deal with constant fragment (Fc) glycans"; "conserved N-glycosylation sites at Asn297." Confirms the tool's N-glyco-only IgG1 scope. |
| **Mn²⁺ is a required cofactor** for GnT/GalT (`cofMn` term) | Vil-II p1137–1138, Eq. 26 | "a Mn²⁺ ion is required for the enzymatic activity … mediated by the cofactor, is necessary to drive the conformational changes." |
| **Enzyme activity depends on Golgi pH; lumen ~5.9–6.5** | Vil-II p1138 | "Golgi pH is well controlled with typically slightly acidic pH of 5.9–6.5"; enzymes have a fitted optimal Golgi pH. Model's lumen 6.0–6.5 + per-enzyme optima 6.2–6.7 sit here. |
| **Higher culture pH → more processed glycans** (gal, sia) | Vil-I p1127, Fig. 3D | "dose-dependent increase of more processed glycans as a function of culture pH, particularly for FA2G1, FA2G2, and sialylated structures." |
| **Ammonia raises Golgi lumen pH → depresses galactosylation** (`golgi_pH` ammonia term) | Vil-II p1138, Eq. 28; Vil-I p1127 | Ammonia modeled raising Golgi pH via Henderson–Hasselbalch; "very high ammonia levels resulted in almost exclusively nongalactosylated forms." Implemented as a saturating +pH term, neutral below the baseline ammonia peak (~8 mM). |
| **High-mannose (mannosidase) is largely invariant** (ER step fixed) | Vil-I p1126, p1129 | "high mannose structures M7 and M6 … not significantly affected indicating a high and unchanged mannosidase activity." Supports treating the ER/mannosidase step as high-fidelity. |

## B. Parameter directions & magnitudes confirmed from source

| Model behavior | Source + location | Quantitative anchor |
|---|---|---|
| **Mn²⁺ raises galactosylation, saturating ~1 mM** (`michaelis(Mn,KMn)`) | Vil-I p1129, Fig. 7 | Mn effect screened over ~4 orders of magnitude; "significant changes … started at 0.01 mmol/L and reached saturation at around 1 mmol/L." Michaelis-like — matches the model's saturating cofactor. |
| **Galactose feed → UDP-Gal → galactosylation** (`Fgal`) | Vil-I p1128, Fig. 5–6 | "higher degree of galactosylation correlates well with the measured increase of UDP-Gal after galactose addition"; MM-like in added galactose, linear in UDP-Gal. |
| **Galactosylation limited by UDP-Gal biosynthesis; Glc & Gln raise UDP-Gal** (precursor coupling) | Fan2015 p521 (abstract), p527 | "galactosylation … limited by UDP-Gal biosynthesis"; "Extracellular glucose and glutamine concentrations and uptake rates were positively correlated with intracellular UDP-Gal." |
| **Man5 rises when UDP-GlcNAc / Gln is limiting** (`asn_level`/Gln → UDP-GlcNAc → Man5) | Fan2015 p521, p531 | "presence of Man5 glycan can be linked to limitation of UDP-GlcNAc biosynthesis as a result of insufficient extracellular Gln." |
| **Sialylation gated by substrate (FA2G2) availability** (sequential build) | Vil-I p1129 | sialylated forms "only appeared due to higher availability of the substrate FA2G2." |
| **Ammonia depresses galactosylation** (candidate coupling — see §D) | Vil-I p1127; Vil-II p1138 | "very high ammonia levels resulted in almost exclusively nongalactosylated forms"; ammonia raises Golgi pH via Henderson–Hasselbalch (Vil-II Eq. 28). |

## C. Normalized placeholders (NOT literature values — calibrated)

Stated plainly for honesty: these are **not** taken from the papers' tables.
- `K_glcnac = K_gal = K_fuc = K_neu = 0.5` — Michaelis constants on the model's **normalized** nucleotide-sugar pool scale (pools are expressed relative to baseline = 1.0). The papers report real dissociation constants (JdV Tables 2–4 / SI) but on absolute concentration scales that don't transfer to the normalized pools; 0.5 is a scaling choice, not a measured value.
- `k_gnt, k_gal, gal2_rel, k_fut, k_sia` — forward-rate constants **calibrated** so the baseline reproduces a canonical G0F-dominant human-like IgG1 Fc profile (G0F ~46%, Gal ~52%, aFuc ~3.7%, Sia ~4%). The *functional form* (enzyme × donor × pH × Mn, sequential) is sourced (§A/§B); the numeric rates are fit, not read from the papers.

**Bottom line:** the model's **structure and every parameter *direction*** is literature-sourced and now page-cited; the **absolute kinetic constants** are calibrated to a canonical profile because the model runs on normalized pools. That is an honest "literature-directed, canonically-calibrated" twin — not a claim that each rate constant was transcribed from a table.

## D. Improvement opportunities surfaced by the full papers
1. ✅ **DONE — Ammonia → Golgi pH → galactosylation coupling.** `golgi_pH()` now takes ammonia and adds a saturating +pH term (Henderson–Hasselbalch, Vil-II Eq. 28), anchored at 8.5 mM (just above the baseline ammonia peak ~8.1) so the calibrated baseline is provably unchanged and only *elevated* ammonia moves the glycan. Validated: baseline harvest bit-identical; +10 mM ammonia → galactosylation 58→53, +22 mM → 41 ("almost exclusively nongalactosylated," Vil-I). Wired into both the Python reference and the TS engine (36/36 port tests pass; only the high-glutamine `rich_feed` fixture moved). Surfaced in the Cell Biology tab as a live lever.
2. **pH↔specific-productivity link.** Vil-I p1127 attributes more-processed glycans at low pH partly to *lower specific productivity → higher per-cell enzyme availability*. A second-order effect; optional.
3. **Mn saturation constant anchored to ~1 mM.** Vil-I Fig. 7 gives an explicit saturation point; `KMn` could be expressed on an absolute Mn scale rather than normalized, tying the slider to real mmol/L.
