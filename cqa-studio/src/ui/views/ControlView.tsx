import { useMemo, useState } from 'react';
import { Plot, CQACard } from '../components';
import { simulateControl, defaultPID } from '../../model/control';
import { DEFAULT_SPECS } from '../../model/analysis';
import type { Knobs } from '../../model/types';

/**
 * Closed-loop control view — a mechanistic digital twin with a PID controller
 * that holds dissolved CO2 (hence Golgi pH, hence galactosylation) at a setpoint
 * by manipulating the CO2-stripping rate (kLa_CO2, a gas-flow proxy).
 */
export function ControlView({ knobs }: { knobs: Knobs }) {
  const [sp, setSp] = useState(45);
  const [Kp, setKp] = useState(0.010);
  const [Ti, setTi] = useState(24);
  const [loop, setLoop] = useState<'closed' | 'open'>('closed');
  const [dist, setDist] = useState(false);   // inject a CO₂-stripping disturbance

  const disturbance = dist ? { startDay: 5, endDay: 8, deltaStrip: 25 } : null;
  const { open, closed } = useMemo(() => ({
    open: simulateControl(knobs, null, 13, disturbance),
    closed: simulateControl(knobs, { ...defaultPID(), sp, Kp, Ti }, 13, disturbance),
  }), [knobs, sp, Kp, Ti, dist]);

  const active = loop === 'closed' ? closed : open;
  const openH = open.t.map((d) => d * 24);   // day -> culture hour
  const closedH = closed.t.map((d) => d * 24);
  const gs = DEFAULT_SPECS.find((s) => s.key === 'galactosylation')!;
  const gSpec: [number, number] = [gs.lo, gs.hi];

  return (
    <div className="view">
      <div className="bio-legend">
        <span><b>Model-based control.</b> The twin's dissolved CO₂ is a controllable state
        (d·pCO₂/dt = production − k<sub>L</sub>a·(pCO₂−strip)). A PID controller manipulates the
        CO₂-stripping rate k<sub>L</sub>a to hold pCO₂ — and therefore Golgi pH and galactosylation —
        at setpoint. Compare open-loop (no control) vs closed-loop, and watch the CQA-vs-titer tradeoff.</span>
      </div>
      <div className="ctrl-howto">
        <b>How to use:</b> ① Pick <b>Closed loop (PID)</b> to turn the controller on. ② Set the <b>pCO₂ setpoint</b> —
        the target dissolved-CO₂ the controller holds. Lower setpoint → less CO₂ → higher Golgi pH → the controller
        strips harder (raises kLa). ③ <b>Kp</b> (gain) sets how aggressively it reacts to error; <b>Ti</b> (integral
        time) sets how fast it removes steady offset — smaller Ti = faster but more overshoot. Watch the two lower
        plots: galactosylation tracks the setpoint, and titer moves the opposite way — a <b>low setpoint improves
        titer but slightly lowers galactosylation; a high setpoint lifts galactosylation at a titer cost.</b> That
        tradeoff is the control-strategy decision this tab exists to inform.
      </div>

      <div className="ctrl-howto">
        <b>On the setpoint range:</b> the slider now spans <b>30–120 mmHg</b>. Bench cultures often sit at 30–60; large
        or high-density processes genuinely run higher (80–120 is not unusual when stripping is limited), and some
        products tolerate or even need a higher pCO₂ operating point. There is no universal "correct" setpoint — it's
        product- and scale-specific, which is exactly what this tab lets you explore.
        <br /><br />
        <b>How to tune Kp (and is it universal?):</b> <b>No — Kp is not universal.</b> It has units (here, change in kLa
        per mmHg of pCO₂ error), so its right value depends on your vessel's stripping response and how noisy the
        measurement is. Practical tuning: start low, raise Kp until the controller tracks the setpoint briskly without
        oscillating; if pCO₂ rings or overshoots, lower Kp or raise Ti (integral time). This is a lumped single-loop
        illustration — a real plant controller is tuned against that specific bioreactor's step response (or a model of
        it), and the gains do not transfer between scales or vessel geometries.
        <br /><br />
        <b>"If Kp isn't universal, what's the point?"</b> The <i>structure</i> is universal even though the number isn't.
        What transfers to any process is the <b>control strategy</b> — hold pCO₂ by modulating CO₂ stripping, because
        pCO₂ → Golgi pH → galactosylation — and the <b>CQA-vs-titer tradeoff map</b> this tab draws. Only the single
        gain Kp is vessel-specific, and that is true of <i>every</i> real loop (pH, DO, temperature): none of their
        gains transfer between a 3 L and a 2000 L tank. Tuning per vessel is standard practice, not a flaw. The tool
        saves you from discovering the strategy and setpoint direction by trial-and-error on expensive runs; the final
        gain is expected calibration on the actual equipment.
        <br /><br />
        <b>Disturbance-rejection demo:</b> tick <b>Inject CO₂ disturbance</b> to simulate a stripping-efficiency loss
        on days 5–8 (e.g. a sparger fouling or a scale-up gas-transfer drop). In <b>open loop</b> pCO₂ climbs and
        galactosylation drifts — the batch would miss. In <b>closed loop</b> the controller detects the rising pCO₂ and
        strips harder to pull it back to setpoint, protecting the glycan. This is the whole point of feedback control:
        rejecting disturbances the open-loop process cannot.
      </div>

      <div className="ctrl-controls panel">
        <div className="ctrl-row">
          <label className="ctrl-toggle">
            <button className={`btn ${loop === 'open' ? 'primary' : ''}`} onClick={() => setLoop('open')}>Open loop</button>
            <button className={`btn ${loop === 'closed' ? 'primary' : ''}`} onClick={() => setLoop('closed')}>Closed loop (PID)</button>
          </label>
          <label className="ctrl-dist">
            <input type="checkbox" checked={dist} onChange={(e) => setDist(e.target.checked)} />
            <span>Inject CO₂ disturbance (stripping loss, day 5–8)</span>
          </label>
          <div className="ctrl-slider">
            <span>pCO₂ setpoint <b>{sp} mmHg</b> <span className="ctrl-range">(range 30–120)</span></span>
            <input type="range" min={30} max={120} step={1} value={sp} onChange={(e) => setSp(+e.target.value)} />
          </div>
          <div className="ctrl-slider">
            <span>Gain K<sub>p</sub> <b>{Kp.toFixed(3)}</b></span>
            <input type="range" min={0.002} max={0.03} step={0.001} value={Kp} onChange={(e) => setKp(+e.target.value)} />
          </div>
          <div className="ctrl-slider">
            <span>Integral T<sub>i</sub> <b>{Ti} h</b></span>
            <input type="range" min={6} max={72} step={2} value={Ti} onChange={(e) => setTi(+e.target.value)} />
          </div>
        </div>
      </div>

      <div className="cqa-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        <CQACard label="Harvest galactosylation" value={active.harvest.galactosylation} lo={gSpec[0]} hi={gSpec[1]} color="#0ea5a4" />
        <div className="cqa-card"><div className="cqa-label">Titer</div>
          <div className="cqa-value">{active.titer.toFixed(0)}<span className="cqa-unit"> mg/L</span></div>
          <div className="cqa-sub">final product</div></div>
        <div className="cqa-card"><div className="cqa-label">pCO₂ tracking error (IAE)</div>
          <div className="cqa-value">{loop === 'closed' ? closed.iae.toFixed(0) : '—'}</div>
          <div className="cqa-sub">mmhg·h · lower = tighter control</div></div>
        <div className="cqa-card"><div className="cqa-label">final k<sub>L</sub>a (gas demand)</div>
          <div className="cqa-value">{active.mv[active.mv.length - 1].toFixed(3)}</div>
          <div className="cqa-sub">manipulated variable</div></div>
      </div>

      <div className="panel-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="panel">
          <div className="panel-title">Controlled variable — dissolved CO₂</div>
          <Plot height={260}
            data={[
              { x: openH, y: open.pCO2, name: 'open loop', line: { color: '#93a1b5', dash: 'dot', width: 2 }, mode: 'lines' },
              { x: closedH, y: closed.pCO2, name: 'closed loop', line: { color: '#2563eb', width: 2.4 }, mode: 'lines' },
              { x: closedH, y: closed.sp, name: 'setpoint', line: { color: '#dc2626', dash: 'dash', width: 1.4 }, mode: 'lines' },
            ] as any}
            layout={{ xaxis: { title: 'Cell culture duration (h)' }, yaxis: { title: 'pCO₂ (mmHg)' } }} />
        </div>
        <div className="panel">
          <div className="panel-title">Manipulated variable — CO₂ stripping k<sub>L</sub>a</div>
          <Plot height={260}
            data={[
              { x: closedH, y: closed.mv, name: 'controller output', line: { color: '#0ea5a4', width: 2.2 }, mode: 'lines' },
            ] as any}
            layout={{ xaxis: { title: 'Cell culture duration (h)' }, yaxis: { title: 'kLa_CO₂ (1/h)' } }} />
        </div>
        <div className="panel">
          <div className="panel-title">Quality response — galactosylation</div>
          <Plot height={260}
            data={[
              { x: openH, y: open.galactosylation, name: 'open loop', line: { color: '#93a1b5', dash: 'dot', width: 2 }, mode: 'lines' },
              { x: closedH, y: closed.galactosylation, name: 'closed loop', line: { color: '#0ea5a4', width: 2.4 }, mode: 'lines' },
              { x: [0, closedH[closedH.length - 1]], y: [gSpec[0], gSpec[0]], name: 'spec', line: { color: '#dc2626', dash: 'dash', width: 1 }, mode: 'lines' },
              { x: [0, closedH[closedH.length - 1]], y: [gSpec[1], gSpec[1]], showlegend: false, line: { color: '#dc2626', dash: 'dash', width: 1 }, mode: 'lines' },
            ] as any}
            layout={{ xaxis: { title: 'Cell culture duration (h)' }, yaxis: { title: 'galactosylation (%)' } }} />
        </div>
        <div className="panel">
          <div className="panel-title">Growth &amp; product</div>
          <Plot height={260}
            data={[
              { x: closedH, y: closed.Xv, name: 'VCD (closed)', line: { color: '#2563eb', width: 2 }, mode: 'lines' },
              { x: closedH, y: closed.mAb, name: 'titer (closed)', yaxis: 'y2', line: { color: '#9333ea', width: 2 }, mode: 'lines' },
            ] as any}
            layout={{ xaxis: { title: 'Cell culture duration (h)' }, yaxis: { title: 'VCD (1e6/mL)' },
              yaxis2: { title: 'titer (mg/L)', overlaying: 'y', side: 'right', gridcolor: 'transparent', color: '#5a6b83' } }} />
        </div>
      </div>

      <div className="panel-note" style={{ marginTop: 4 }}>
        The controller closes the loop on a <b>mechanistic</b> twin, not a black box — the same ODE that drives every
        other tab. A low pCO₂ setpoint holds galactosylation but demands more stripping gas and can trim titer; a high
        setpoint saves gas but risks the CQA drifting toward spec. This is the CPP→CQA control problem that soft-sensor /
        advanced-process-control (APC) systems solve on the plant floor.
      </div>
    </div>
  );
}
