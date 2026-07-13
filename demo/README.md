# Demo video — build instructions

`animation.html` is the **finding video** (research-track cut, ~122 s, silent by design —
captions are baked in). It's self-contained (figures embedded), so it renders anywhere with
a browser.

## Render it (on your Mac — this sandbox can't run a browser)
```bash
cd demo
npm i playwright && npx playwright install chromium   # one-time
# ffmpeg once:  brew install ffmpeg
./build.sh
```
`build.sh` spot-checks 8 frames (view them), then captures all frames and encodes `demo.mp4`.

## Preview without rendering
Just open `animation.html` in any browser — it plays in real time, scaled to the window.

## Narrative (matches docs/SUBMISSION_demo_script.md)
1. The belief (myth)  2. GlycoTwin, the instrument  3. Scale experiment — galactosylation robust
4. O2 is not a lever  5. The real lever is the clone (B4GALT1 +35 pp)  6. Why mechanistic + implication
7. Reproducible/open/agentic  8. Close — "engineer the clone, not the gas"

## Optional: splice in live-app footage
For beats that show the actual UI reacting (dragging B4GALT1, the PID disturbance-rejection loop),
screen-record the running app (`open ../glycotwin_app.html`) on your Mac and drop those clips over
scenes 2/5/6 in iMovie/CapCut. Not required — the figure-based cut stands on its own.

## Change the length
Edit `window.__DURATION` and the scene `animation-delay`/`-duration` values in `animation.html`.
