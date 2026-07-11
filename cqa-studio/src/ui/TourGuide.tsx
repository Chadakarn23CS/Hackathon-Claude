/**
 * First-run guided tour (custom, dependency-free, offline). Spotlights key UI
 * regions with brand-styled coachmarks; auto-runs once (localStorage flag) and
 * can be replayed from the header "Tour" button. Some steps switch tabs so the
 * highlighted element is on screen.
 */
import { useEffect, useState, useCallback } from 'react';

type Placement = 'bottom' | 'top' | 'right' | 'left';
interface TStep { sel: string; tab?: string; title: string; body: string; place?: Placement; }

const STEPS: TStep[] = [
  { sel: '.hdr h1', title: 'Welcome to GlycoTwin',
    body: 'A mechanistic digital twin that links a bioreactor knob to the antibody’s N-glycan quality attributes.', place: 'bottom' },
  { sel: '.tabs', title: '12 connected views',
    body: 'The whole story in tabs — molecule → bioreactor → glycan → CQA → control. Follow them in order the first time.', place: 'bottom' },
  { sel: '.wf-map', tab: 'wf', title: 'Start at the Workflow map',
    body: 'Five stages, eight steps. Click any node to jump straight into the tool where you act on it.', place: 'top' },
  { sel: '.sidebar', tab: 'bio', title: 'Turn a process knob',
    body: 'Every slider is a real process or genome input — CO₂ stripping, feeds, temperature, Mn²⁺, enzyme expression.', place: 'right' },
  { sel: '.bio-output', tab: 'bio', title: 'Quality updates live',
    body: 'The secreted glycan and its CQAs recompute from the mechanistic model as you move the knobs — no waiting for an assay.', place: 'top' },
  { sel: '.hdr-btn', title: 'Save & share a scenario',
    body: 'Export the current operating point (knobs + predicted CQAs + provenance) as a reproducible JSON, or load one back.', place: 'bottom' },
  { sel: '.tabs', title: 'That’s the tour',
    body: 'Explore freely. Replay this anytime from the “Tour” button up top.', place: 'bottom' },
];

const SEEN_KEY = 'glycotwin_tour_v1';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function TourGuide({ tab, setTab, signal }: { tab: string; setTab: (t: string) => void; signal: number }) {
  const [run, setRun] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // auto-run once for first-time visitors
  useEffect(() => {
    try { if (!localStorage.getItem(SEEN_KEY)) { const id = setTimeout(() => { setI(0); setRun(true); }, 900); return () => clearTimeout(id); } } catch { /* ignore */ }
  }, []);
  // replay when the header button bumps the signal
  useEffect(() => { if (signal > 0) { setI(0); setRun(true); } }, [signal]);

  const step = STEPS[i];

  // put the right tab on screen, scroll the target into view, then measure it
  useEffect(() => {
    if (!run) return;
    let cancelled = false;
    const needsTab = step.tab && step.tab !== tab;
    if (needsTab) setTab(step.tab!);
    const id = setTimeout(() => {
      if (cancelled) return;
      const el = document.querySelector(step.sel) as HTMLElement | null;
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      requestAnimationFrame(() => { if (!cancelled) setRect(el.getBoundingClientRect()); });
    }, needsTab ? 440 : 130);
    return () => { cancelled = true; clearTimeout(id); };
  }, [run, i]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the highlight aligned on resize
  useEffect(() => {
    if (!run) return;
    const on = () => { const el = document.querySelector(step.sel) as HTMLElement | null; if (el) setRect(el.getBoundingClientRect()); };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [run, i]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback(() => { setRun(false); setRect(null); try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ } }, []);

  if (!run) return null;
  const last = i === STEPS.length - 1;

  const TW = 330;
  let pop: React.CSSProperties;
  if (rect) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const place: Placement = step.place || 'bottom';
    const left = clamp(rect.left, 14, vw - TW - 14);
    if (place === 'top' && rect.top > 210) pop = { top: rect.top - 14, left, transform: 'translateY(-100%)' };
    else if (place === 'right' && rect.right + TW + 28 < vw) pop = { top: clamp(rect.top, 14, vh - 230), left: rect.right + 16 };
    else if (place === 'left' && rect.left - TW - 28 > 0) pop = { top: clamp(rect.top, 14, vh - 230), left: rect.left - TW - 16 };
    else pop = { top: clamp(rect.bottom + 14, 14, vh - 230), left };
  } else {
    pop = { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  }

  return (
    <div className="tour-root" role="dialog" aria-label="Guided tour">
      {rect
        ? <div className="tour-hole" style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }} />
        : <div className="tour-veil" />}
      <div className="tour-pop" style={{ width: TW, ...pop }}>
        <div className="tour-k">Guided tour · {i + 1} / {STEPS.length}</div>
        <div className="tour-t">{step.title}</div>
        <div className="tour-b">{step.body}</div>
        <div className="tour-row">
          <button className="tour-skip" onClick={finish}>Skip tour</button>
          <div className="tour-nav">
            {i > 0 && <button className="btn ghost" onClick={() => setI(i - 1)}>← Back</button>}
            <button className="btn primary" onClick={() => (last ? finish() : setI(i + 1))}>{last ? 'Done' : 'Next →'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
