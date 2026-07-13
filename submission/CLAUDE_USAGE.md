# How I used Claude

## Paragraph (paste-ready for the form)

I leaned on the whole Claude family, and each part earned its place. It started as a
conversation in **Claude**, where I talked through the biological question I'd been sitting on —
what really controls antibody galactosylation as you scale a process up — until it was sharp
enough to test. From there, **Claude Science** did the real scientific heavy lifting. It read
the literature with me so every parameter traces back to a public source, helped me build the
mechanistic model that runs the whole chain from bioreactor to Golgi to N-glycan, ran the
experiments behind the finding, and let me package the workflow as a reusable skill
(`cho-cqa-recalibrate`) that refits the model to a new molecule. Honestly, the part I valued
most was that it kept checking my science as we went — more than once it caught an explanation
that didn't actually match the model, or a claim I couldn't source, and made me fix it. **Claude
Code** was where the app got built and hardened: debugging, adding features, and running the
tests so I could trust it. Because the whole project lives in a GitHub repo, I could even keep
going on my phone in Claude Code when I was away from my laptop, then come back and pick the
deeper science up again in Claude Science. And **Claude Design** made it look like real software
rather than a prototype. If I had to name the center of it all, it was Claude Science — it turned
a question into a finding I can reproduce, and the tool that produced it; Code and Design made
that tool something people can actually use.

## Breakdown by product

I used the Claude product suite end-to-end, each where it was strongest.

**Claude** was where the project began — I brainstormed the biological question
at the start of the hackathon (what really controls antibody galactosylation as a
process scales up?) and shaped it into something testable.

**Claude Science** did the heavy scientific lifting. It ran the deep research and
literature review that grounded every parameter in public sources, built the
mechanistic model (CHO bioreactor → Golgi → N-glycan), ran the analysis behind the
finding, and authored a reusable recalibration skill (`cho-cqa-recalibrate`, shipped
in the repo) that refits the twin to a new product's glycan data. It also
continuously checked my work for scientific correctness — flagging where an
explanation didn't match the model and where a claim needed a source.

**Claude Code** handled the engineering loop: debugging, developing and improving
the app, and running the smoke tests and Playwright frame-capture (for the demo)
so I could trust the build. Because everything is anchored to the GitHub repo, I
could pick the work up in Claude Code on my phone while away from my laptop —
pulling the latest, making progress, and pushing back — then continue the deeper
scientific work in Claude Science later, without ever losing my place.

**Claude Design** made the tool feel like professional software — improving the
UI and interface (layout, color, the instrument-style theme).

**Where it mattered most:** Claude Science was the center of gravity — it turned a
question into a validated, reproducible finding and the tool that produced it,
while Claude Code and Claude Design made that tool robust and usable, and Claude
set the direction.
