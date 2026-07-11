# Demo video script & storyboard — 3:00 max

Format: screen recording of the single-file app + voiceover. Every number below is
reproducible in the app or the test suite — nothing is claimed that isn't shown.
Target 2:50 to leave headroom. The tool is GlycoTwin; tabs are numbered 1–10 plus
Workflow and How-to-Use.

---

## 0:00–0:18 — The molecule (Workflow → 1 · Antibody Molecule)
**Voiceover:** "Every biologic drug is a molecule. This is a real IgG1 — domain map from
UniProt, 3D structure from the PDB. Its quality is decided by one thing: the sugar at
Asn297. Click a glycan feature and you see the clinical consequence."
**On screen:** Open on Workflow (the molecule→decision spine), click into Antibody Molecule.
Click **Core fucose** → ADCC via FcγRIIIa; click **galactose** → CDC via C1q. Each shows its
SNFG symbol. Land the point: process choices move these.

## 0:18–0:45 — Where it's built (2 · Cell Biology)
**Voiceover:** "N-glycosylation starts in the ER, matures in the Golgi. Two levers control
it — the enzymes, and the nucleotide-sugar donors that feed them. Watch both."
**On screen:** Cell Biology tab. Drag **Mn²⁺** up — β4GalT station brightens, glycan gains
galactose. Drag **CO₂ stripping** down — Golgi lumen turns amber (acidifies), galactosylation
falls. Drag **Dissolved O₂** down — mitochondrion dims, sialylation falls. Let the causal
chain show for a few seconds without narration.

*Optional ammonia beat (if pacing allows, ~6 s):* raise **glutamine feed** — ammonia climbs
late in the batch, the Cell Biology panel's ammonia bullet updates, and galactosylation drops.
One line of voiceover: "Push glutamine and ammonia builds — it raises Golgi pH the opposite way
CO₂ lowers it, so late-batch galactose falls. That mechanism was added during the event, from
the Villiger papers." This is the one beat that shows a mechanism built *during* the hackathon.

## 0:45–1:10 — Grounded, and the second lever visible (3 · Live Simulation)
**Voiceover:** "We started from a real question — do scale-dependent CO₂ and pH gradients
shift glycan CQAs? — and grounded the model in public datasets: CHOGlycoNET, a CSBJ
anti-Her2 study, a 2026 mAbs meta-analysis. It reproduces the literature's under-5% ceiling
blind. And here's the substrate lever most tools hide: the nucleotide-sugar donor pools,
draining as the batch runs."
**On screen:** Live Simulation. Baseline: peak VCD ~20×10⁶, titer ~5300, galactosylation ~52%.
Scroll to the donor-pool plot (UDP-Gal, CMP-NeuAc, etc.) falling over the batch.

## 1:10–1:40 — Quality-by-Design (4 Monitor → 6 Design Space → 8 Robustness)
**Voiceover:** "It's a twin, not a simulator: enter a running batch's samples and it
re-forecasts the harvest and flags a corrective move. For a filing you need a design space,
not a point — sweep two parameters, and keep your normal operating range inside the proven
acceptable range. Then Monte-Carlo it for a capability index."
**On screen:** Batch Monitor — enter a day-7 reading, show the bias bar + re-forecast. Design
Space — NOR box inside the PAR contour. Robustness — Cpk histogram with spec lines.

## 1:40–2:15 — The headline: closed-loop control + disturbance rejection (7 · Process Control)
**Voiceover:** "Dissolved CO₂ is a controllable state, so we put a PID loop on it — holding
pCO₂, and therefore galactosylation, at setpoint. Now inject a disturbance: a CO₂-stripping
loss, like a sparger fouling. Open-loop, pCO₂ climbs and the batch drifts. Closed-loop, the
controller strips harder and pulls it back. That's feedback control protecting a CQA, live
on a mechanistic twin."
**On screen:** Toggle open→closed. Tick **Inject CO₂ disturbance** — show open-loop pCO₂
climb to ~70, then closed-loop recover to ~setpoint. Note the CQA-vs-titer tradeoff.

## 2:15–2:45 — Governance + how Claude Science got us here (10 · Agent Optimize)
**Voiceover:** "Give a target glycan profile and an agent loop searches for the process that
hits it — every proposal scored by the mechanistic model, never the LLM's opinion, and every
recipe gated by a policy check and human sign-off. Claude Science took this from a literature
map to a validated, tested app — porting a Python reference to a TypeScript engine that
matches to under two-tenths of a percent across 36 tests, and publishing a skill that
recalibrates the whole twin to any product in three calls."
**On screen:** Agent Optimize — run a target, show the Proposer→Evaluator→Critic graph and
the governance verdict. Cut to terminal: `npm test` → 36 passed.

## 2:45–2:55 — Close
**Voiceover:** "One HTML file. No install. From bioreactor knob to antibody glycan — the
whole causal chain, interactive, and entirely open."
**On screen:** Return to Workflow, one slider sweep, freeze on the schematic.

---

### Recording notes
- Single-file `cqa_studio_app.html` opens in any browser — no server, no build.
- Keep cursor movements slow; the reactivity is the star.
- Priority order if time-constrained: Antibody+Cell Biology (0:00–0:45) → Process Control
  with disturbance (1:40–2:15) → Claude Science close (2:15–2:45). Monitor/Design/Robustness
  can be trimmed to a fast montage.
- The LLM proposer in Agent Optimize is optional and server-side; the demo can run the
  in-browser search (no key) and still show the full loop.
- The ammonia beat is optional but high-value for the "New Work" rule — it's the clearest
  on-screen evidence of a mechanism implemented during the event. Drop it only if over 2:55.
