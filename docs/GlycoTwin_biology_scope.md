# GlycoTwin — Biology Scope & Extension Path

## The two control levers (what the model is built on)
Glycosylation is governed by two coupled elements, and GlycoTwin's engine encodes both
as a multiplicative activity law: **enzyme activity = expression × pH-factor × Mn-cofactor × substrate(Michaelis)**.

1. **Enzymes** — glycosyltransferases/glycosidases in the ER→Golgi (the catalysts).
   Levers: expression (MGAT, B4GALT1, FUT8, ST6GAL1), Golgi-lumen pH (per-enzyme optimum),
   Mn²⁺ cofactor, and residence time τ (conversion = 1 − exp(−activity·τ)).
2. **Nucleotide-sugar donors** — UDP-GlcNAc, UDP-Gal, GDP-Fuc, CMP-NeuAc (the substrates).
   Fed by central metabolism (glucose/glutamine/asparagine). Supply side: a fully-active
   enzyme adds nothing if its donor pool is depleted. Either lever at zero shuts a step down.

## Why control is hard (and why a mechanistic model earns its place)
The network is **sequential and branched**. A glycan is built step-by-step during transit:
GlcNAc antenna → galactose → sialic acid, with core fucose a parallel branch. Downstream
steps are gated by upstream ones (galactose only where an antenna exists; sialic acid only
where galactose exists). You steer a whole competing distribution under one transit time —
so terminal features are coupled and non-obvious. This sequential dependency is exactly what
a step-gated mechanistic model carries and a lookup table cannot.

## Current scope: N-linked, IgG1 Fc
- Models **N-glycosylation** of the IgG1 Fc glycan at **Asn297**.
- This is the complete CQA story for a canonical mAb: afucosylation→ADCC (FcγRIIIa/CD16),
  galactosylation→CDC (C1q), sialylation→half-life/anti-inflammatory, high-mannose→clearance.
- IgG1 Fc carries **no O-glycosylation**, so N-linked is sufficient for the antibody use case.
- Verified against code: the two levers and the sequential branched build are the actual
  engine structure (src/model/engine.ts, glyco()), not just narrative.

## NOT modeled (honest boundary): O-glycosylation
O-glycosylation is a **distinct process** and is deliberately out of scope:
- Mucin-type, initiated by the **GALNT** family on Ser/Thr; template-independent, **no single
  consensus sequon** (unlike N-linked Asn-X-Ser/Thr) — site occupancy is itself hard to predict.
- Relevant to **other molecule classes**: Fc-fusion proteins, IgA (hinge O-glycans), EPO,
  coagulation factors, G-CSF.
- Claiming O-glycosylation coverage would overreach; scoping to N-linked Fc is the honest,
  stronger position.

## Extension path (if the tool grows beyond IgG1)
A future **O-glycosylation module** would be the natural next increment, and the field gap is real:
1. **Molecule generalization first** — the live-fetch-any-antibody endpoint (already scoped):
   accept a UniProt accession, pull real domains + N-glycosylation sites from InterPro.
2. **O-glycan initiation** — model GALNT-mediated Ser/Thr occupancy as a stochastic/occupancy
   layer (no fixed sequon), separate from the N-linked train.
3. **Core structures** — the common O-glycan cores (Tn, T/core-1, core-2) with their own
   transferases and the same donor-pool coupling (UDP-GalNAc, UDP-Gal, CMP-NeuAc).
4. **Shared substrate pool** — O- and N-glycosylation compete for CMP-NeuAc/UDP-Gal, so the
   donor tanks become a shared resource — a genuinely novel coupling most models omit.
This keeps the two-lever architecture; only the reaction network and initiation logic change.

## One-line scope statement for the submission
"A mechanistic digital twin of **Fc N-glycosylation for IgG1**, driven by the two real control
levers — Golgi enzymes and nucleotide-sugar donors — across the full molecule→process→CQA→control chain."
