# Related work: GlycoPy (Ma, Guo & Braatz, MIT) — comparison & what GlycoTwin adopts

**Reference.** Y. Ma, J. Guo, R. D. Braatz. *GlycoPy: A CasADi-based Python Framework for
Hierarchical Modeling, Optimization, and Control of Bioprocesses.* Computers & Chemical
Engineering 213:109726 (2026). DOI 10.1016/j.compchemeng.2026.109726. arXiv:2601.01413.
Code: github.com/eaglema/glycopy (framework) + github.com/eaglema/glycosylation
(CHO mAb glycosylation application). Author is a postdoc in the Braatz group at MIT.
Prior model: Ma et al., *Quasi-steady-state approach for efficient multiscale simulation and
optimization of mAb glycosylation in CHO*, Chem. Eng. Sci. 318:122162 (2025).

## What GlycoPy is
An **equation-oriented, object-oriented Python framework** built on CasADi. Its purpose is not
a single model but the *infrastructure* for building large multiscale bioprocess models and
embedding them in gradient-based dynamic optimization and **nonlinear MPC (NMPC)**:
- hierarchical `Model` objects with differential (x) / algebraic (z) / parameter (p) variables;
- symbolic **DAE** assembly + CasADi automatic differentiation → analytic sensitivities;
- **customized differentiable simulation** (their QSS Golgi solver) embedded directly in the
  optimizer, plus control-vector-parameterization (CVP) dynamic optimization and adaptive NMPC.
The demonstration application is the same problem GlycoTwin models: multiscale mAb N-glycosylation
in CHO — a cell-culture submodel feeding a Golgi reaction-network submodel.

## Shared physics, different fidelity
Both models agree on the **drivers** of Golgi glycosylation — enzyme expression, nucleotide-sugar
donor availability, and the Mn²⁺ cofactor — but they encode the enzyme rate laws at different
fidelity. GlycoPy implements **three enzyme-specific kinetic mechanisms** (paper p.7): *"three
reaction classes are implemented according to the kinetic mechanism: random-order Bi-Bi kinetics,
sequential Bi-Bi kinetics, and Michaelis–Menten kinetics,"* with the kinetic type set per enzyme —
so galactosyl- and GlcNAc-transferases use two-substrate Bi-Bi forms, not a single Michaelis term.
GlycoTwin deliberately uses a **reduced single-substrate Michaelis form** (`enzyme × donor ×
Mn-cofactor`, sequential build) — fewer states, closed-form, fast enough for a live browser twin.
So this is not identical kinetics: it is agreement on **which levers matter**, with GlycoPy the
higher-fidelity mechanistic reference and GlycoTwin the interactive reduced-order tool. GlycoPy's
cell model also carries **ammonia inhibition and ammonia-driven death** (KI_Amm≈3.2 mM,
Kd_Amm≈14.3 mM), consistent with the ammonia→Golgi-pH coupling we added.

## Where they differ (the honest comparison)

| Dimension | GlycoPy (Ma/Braatz) | GlycoTwin (this project) |
|---|---|---|
| **Primary goal** | A general *framework* + research-grade NMPC engine (Python/CasADi) | An *interactive, explainable* browser twin for process/CQA understanding + a governance-gated agent optimizer |
| **Golgi network** | Full stoichiometric reaction network (all OS species, explicit NSD consumption) | Reduced sequential build (Man5→G0→G1→G2→sialyl, fucose branch) — fewer states, closed-form |
| **Metabolites** | Explicit Glc, Gln, Glu, **Asn, Asp, Urd**, Lac, Amm, Gal | Glc, Gln, Lac, Amm, CO₂, Gal (others lumped/2nd-order) |
| **Optimization** | Gradient-based dynamic optimization + adaptive **NMPC** with analytic sensitivities | PID setpoint control + Proposer→Evaluator→Critic agent search (LLM or deterministic) |
| **Deployment** | Python package (Poetry), research use | Single-file HTML (offline) + FastAPI backend; runs in a browser, no install |
| **Audience** | Modelers/control engineers writing code | Process scientists, tech-transfer, reviewers — no code needed |
| **License** | No license file in the repos (all-rights-reserved despite "open-source" in text) | MIT |

Neither is a substitute for the other: GlycoPy is a **modeling/NMPC toolkit**; GlycoTwin is an
**interactive decision-and-explanation tool**. They are complementary.

## What GlycoTwin should adopt (concrete, ranked)
1. **Uridine (Urd) as an explicit galactosylation lever.** GlycoPy tracks Urd (K_Urd≈7 mM,
   inhibits above ~41 mM). Uridine + galactose co-feeding is a documented UDP-Gal booster and a
   real media CPP we don't expose. *High value, cheap:* add a `Urd` knob feeding the UDP-Gal pool,
   with an inhibitory ceiling — same pattern as the Mn²⁺ and galactose levers.
2. **NMPC framing for the Process Control tab.** Our PID holds pCO₂ to a setpoint. GlycoPy's adaptive
   NMPC optimizes a *trajectory* subject to constraints. We can't run a full NMPC in-browser, but we
   can (a) cite NMPC as the production-grade successor to the PID demo, and (b) frame the agent
   optimizer as a discrete-decision analogue. *Framing/citation, not a build.*
3. **Analytic sensitivity as the "right way" note.** GlycoPy gets exact gradients via CasADi AD; our
   Sensitivity tab uses finite differences. Worth a one-line honesty note that AD is the scalable
   method for larger models. *Documentation.*
4. **Ammonia coupling — already done** (this session), and independently corroborated by GlycoPy's
   ammonia inhibition/death constants.

## Positioning for the hackathon
GlycoPy is strong, recent (2026), MIT-authored evidence that **this exact problem is an active,
serious research target** — and that the mechanism GlycoTwin encodes is the accepted one. GlycoTwin's
distinct contribution is the **interactive, explainable, agent-augmented, zero-install** angle that a
Python/CasADi research package deliberately does not occupy. Citing GlycoPy as related work
strengthens the submission rather than threatening it.
