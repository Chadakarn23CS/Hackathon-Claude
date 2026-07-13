import { useState, useRef, useEffect } from 'react';
import './ui/theme.css';
import { defaultKnobs } from './model/engine';
import type { Knobs } from './model/types';
import { downloadScenario, parseScenario } from './model/scenario';
import { KNOBS, GROUPS, PRESETS } from './ui/config';
import { Slider, CollapsibleGroup } from './ui/components';
import { CellBiologyView } from './ui/views/CellBiologyView';
import { MoleculeView } from './ui/views/MoleculeView';
import { OptimizeView } from './ui/views/OptimizeView';
import { WorkflowView } from './ui/views/WorkflowView';
import { MonitorView } from './ui/views/MonitorView';
import { SimulateView } from './ui/views/SimulateView';
import { DesignSpaceView } from './ui/views/DesignSpaceView';
import { RobustnessView } from './ui/views/RobustnessView';
import { SensitivityView } from './ui/views/SensitivityView';
import { ControlView } from './ui/views/ControlView';
import { GuideView } from './ui/views/GuideView';
import { ScaleView } from './ui/views/ScaleView';
import { TourGuide } from './ui/TourGuide';

const TABS = [
  { id: 'wf', label: 'Workflow' },
  { id: 'mol', label: '1 · Antibody Molecule' },
  { id: 'bio', label: '2 · Cell Biology' },
  { id: 'sim', label: '3 · Live Simulation' },
  { id: 'mon', label: '4 · Batch Monitor (Twin)' },
  { id: 'sens', label: '5 · Sensitivity' },
  { id: 'ds', label: '6 · Design Space (Q8)' },
  { id: 'ctrl', label: '7 · Process Control' },
  { id: 'rob', label: '8 · Robustness (Cpk)' },
  { id: 'scale', label: '9 · Scale-Up' },
  { id: 'opt', label: '10 · Agent Optimize' },
  { id: 'guide', label: 'How to Use' },
] as const;
type TabId = typeof TABS[number]['id'];

export default function App() {
  const [knobs, setKnobs] = useState<Knobs>(defaultKnobs());
  const [tab, setTab] = useState<TabId>('wf');
  const [tourSignal, setTourSignal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const setKnob = (k: keyof Knobs, v: number) => setKnobs((p) => ({ ...p, [k]: v }));
  const applyPreset = (partial: Partial<Knobs>) => setKnobs({ ...defaultKnobs(), ...partial });

  const fileRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  // A tab switch should land at the top of the new view, not inherit the previous
  // tab's scroll position (the .main scroll container is reused across tabs).
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [tab]);
  const onLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((txt) => {
      try { setKnobs(parseScenario(txt).knobs); }
      catch (err) { alert('Could not load scenario: ' + (err as Error).message); }
    });
    e.target.value = ''; // allow re-loading the same file
  };

  return (
    <div className="app">
      <header className="hdr">
        <span className="brandmark" aria-hidden="true">
          {/* SNFG biantennary N-glycan logomark: GlcNAc squares, mannose circles, galactose caps */}
          <svg width="34" height="30" viewBox="0 0 34 30">
            <line x1="6" y1="15" x2="14" y2="15" stroke="#5b626d" strokeWidth="1.3" />
            <line x1="14" y1="15" x2="22" y2="8" stroke="#5b626d" strokeWidth="1.3" />
            <line x1="14" y1="15" x2="22" y2="22" stroke="#5b626d" strokeWidth="1.3" />
            <line x1="22" y1="8" x2="30" y2="8" stroke="#5b626d" strokeWidth="1.3" />
            <line x1="22" y1="22" x2="30" y2="22" stroke="#5b626d" strokeWidth="1.3" />
            <rect x="2" y="11" width="8" height="8" fill="#2563eb" />
            <rect x="10" y="11" width="8" height="8" fill="#2563eb" opacity="0.85" />
            <circle cx="22" cy="8" r="4.2" fill="#15803d" />
            <circle cx="22" cy="22" r="4.2" fill="#15803d" />
            <circle cx="30" cy="8" r="4.2" fill="#eab308" />
            <circle cx="30" cy="22" r="4.2" fill="#eab308" />
          </svg>
        </span>
        <div>
          <h1>GlycoTwin<span className="tm">digital twin</span></h1>
          <div className="sub">molecule → bioreactor → glycan → CQA → control</div>
        </div>
        <div className="spacer" />
        <button className="hdr-btn" title="Download the current knobs + predicted CQAs + provenance as a reproducible JSON scenario"
          onClick={() => downloadScenario(knobs)}>↓ Export scenario</button>
        <button className="hdr-btn" title="Load a previously exported scenario file to restore its operating point"
          onClick={() => fileRef.current?.click()}>↑ Load</button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onLoadFile} />
        <button className="hdr-btn" title="Replay the guided tour" onClick={() => setTourSignal((s) => s + 1)}>◎ Guided tour</button>
        <span className="badge ok">port ≤0.17%</span>
        <span className="badge">literature-parameterized</span>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="body">
        {tab !== 'guide' && tab !== 'opt' && tab !== 'wf' && !sidebarOpen && (
          <button className="sidebar-rail" title="Show controls" aria-label="Show controls sidebar"
            onClick={() => setSidebarOpen(true)}>▸<span className="rail-label">Controls</span></button>
        )}
        {tab !== 'guide' && tab !== 'opt' && tab !== 'wf' && sidebarOpen && <aside className="sidebar">
          <div className="sidebar-hd">
            <span className="sidebar-hd-t">Controls</span>
            <button className="sidebar-hide" title="Hide controls" aria-label="Hide controls sidebar"
              onClick={() => setSidebarOpen(false)}>◂ Hide</button>
          </div>
          <CollapsibleGroup label="Presets">
            <div className="presets">
              {PRESETS.map((p) => (
                <button key={p.name} className="btn" title={p.desc} onClick={() => applyPreset(p.knobs)}>
                  {p.name}
                </button>
              ))}
              <button className="btn ghost" onClick={() => setKnobs(defaultKnobs())}>↺ Reset</button>
            </div>
          </CollapsibleGroup>
          {GROUPS.map((g) => (
            <CollapsibleGroup key={g.id} label={g.label} color={g.color}>
              {KNOBS.filter((k) => k.group === g.id).map((def) => (
                <Slider key={def.key} def={def} value={knobs[def.key]} onChange={(v) => setKnob(def.key, v)} />
              ))}
            </CollapsibleGroup>
          ))}
        </aside>}

        <main className="main" ref={mainRef}>
          {tab === 'wf' && <WorkflowView go={(t) => setTab(t as TabId)} />}
          {tab === 'bio' && <CellBiologyView knobs={knobs} />}
          {tab === 'mol' && <MoleculeView knobs={knobs} />}
          {tab === 'sim' && <SimulateView knobs={knobs} />}
          {tab === 'mon' && <MonitorView knobs={knobs} />}
          {tab === 'ds' && <DesignSpaceView knobs={knobs} />}
          {tab === 'rob' && <RobustnessView knobs={knobs} />}
          {tab === 'scale' && <ScaleView knobs={knobs} />}
          {tab === 'sens' && <SensitivityView knobs={knobs} />}
          {tab === 'ctrl' && <ControlView knobs={knobs} />}
          {tab === 'opt' && <OptimizeView
            applyKnobs={(partial) => setKnobs({ ...defaultKnobs(), ...partial })}
            go={(t) => setTab(t as TabId)} />}
          {tab === 'guide' && <GuideView />}
          <div className="footer-note">
            Literature-parameterized mechanistic model. The JavaScript engine reproduces its Python reference to
            ≤0.17% (port self-consistency); parameters are literature-directed, not fitted to a specific process.
            Predicted process-parameter trends are directionally consistent with a published meta-analysis, but the
            model is not calibrated to any proprietary dataset — for QbD exploration &amp; training, not GMP release.
          </div>
        </main>
      </div>
      <TourGuide tab={tab} setTab={(t) => setTab(t as TabId)} signal={tourSignal} />
    </div>
  );
}
