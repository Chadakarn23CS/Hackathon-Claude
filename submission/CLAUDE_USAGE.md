# How I used Claude

## Paragraph (paste-ready for the form)

I used the full Claude suite, each product where it was strongest. I started in **Claude**,
brainstorming the biological question the moment I entered the hackathon and shaping it into
something testable. **Claude Science** then did the heavy scientific work: deep research and
literature review to ground every parameter in public sources, building the mechanistic model
(CHO bioreactor → Golgi → N-glycan), running the analysis behind the finding, authoring a
reusable recalibration skill (`cho-cqa-recalibrate`), and — the part that mattered most —
continuously checking my work for scientific correctness, flagging where an explanation didn't
match the model and where a claim needed a source. **Claude Code** ran the engineering loop:
debugging, developing and improving the app, and running smoke tests and Playwright checks so I
could trust the build; because the whole project lives in a GitHub repo, I could continue in
Claude Code on my phone away from my laptop, then pick the deeper science back up in Claude
Science. **Claude Design** made the tool feel like professional software, improving the UI and
interface. Claude Science was the center of gravity — it turned a question into a validated,
reproducible finding and the tool that produced it — while Claude Code and Claude Design made
that tool robust and usable.

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
