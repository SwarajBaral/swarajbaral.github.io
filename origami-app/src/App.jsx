import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { buildModel, creasePattern } from './engine/fold.js';
import { MODELS } from './models/index.js';
import Viewer from './three/Viewer.jsx';
import Diagram, { CreasePattern } from './ui/Diagram.jsx';
import { KIND, PAPERS, stepLines, flatFinal, paperLabel } from './ui/meta.js';
import { player, usePlayer, stepIndexAt } from './store.js';
import * as I from './ui/Icons.jsx';

const builtCache = new Map();
const getBuilt = (m) => {
  if (!builtCache.has(m.id)) builtCache.set(m.id, buildModel(m));
  return builtCache.get(m.id);
};

function useStepNav(built) {
  const t = usePlayer((s) => s.t);
  const playing = usePlayer((s) => s.playing);
  const steps = built.steps;
  const idx = stepIndexAt(steps, t);
  const next = useCallback(() => {
    const { t } = player.get();
    const i = stepIndexAt(steps, t);
    if (i >= steps.length) return;
    player.set({ playing: false, target: steps[i].end });
  }, [steps]);
  const prev = useCallback(() => {
    const { t, target } = player.get();
    const cur = target ?? t;
    let i = stepIndexAt(steps, cur);
    // already at the start of step i: go back to the start of i-1
    const start = i < steps.length ? steps[i].start : steps[steps.length - 1].start;
    const dest = cur - start > 0.02 && i < steps.length ? start : steps[Math.max(0, Math.min(i, steps.length) - 1)].start;
    player.set({ playing: false, target: dest });
  }, [steps]);
  const toggle = useCallback(() => {
    const st = player.get();
    if (st.playing) player.set({ playing: false });
    else if (stepIndexAt(steps, st.t) >= steps.length) player.set({ t: 0, playing: true, target: null, hold: 0.3 });
    else player.set({ playing: true, target: null, hold: 0 });
  }, [steps]);
  const goto = useCallback((i) => player.set({ playing: false, target: steps[i].start }), [steps]);
  return { t, idx, playing, next, prev, toggle, goto };
}

function Timeline({ built, nav }) {
  const n = built.atomics.length;
  const pct = (nav.t / n) * 100;
  return (
    <div className="timeline">
      <div className="track" style={{ '--p': `${pct}%` }}>
        {built.steps.map((s, i) => (
          <button
            key={i}
            className={`tick ${i < nav.idx ? 'done' : ''} ${i === nav.idx ? 'now' : ''}`}
            style={{ left: `${(s.start / n) * 100}%`, width: `${((s.end - s.start) / n) * 100}%` }}
            onClick={() => nav.goto(i)}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
            title={`${i + 1}. ${s.title}`}
          />
        ))}
        <input
          type="range"
          min={0}
          max={n}
          step={0.001}
          value={nav.t}
          aria-label="Fold progress"
          onChange={(e) => player.set({ t: +e.target.value, playing: false, target: null })}
        />
      </div>
    </div>
  );
}

function PrintDialog({ open, onClose, onPrint, model }) {
  const [cp, setCp] = useState(true);
  const [sheet, setSheet] = useState(true);
  if (!open) return null;
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="print-title" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close"><I.Close /></button>
        <h2 id="print-title">Print the {model.name.toLowerCase()}</h2>
        <p className="muted">The guide prints as a {paperLabel(model)}, the recommended paper size. Print at 100%, cut it out and fold along the lines.</p>
        <label className="check">
          <input type="checkbox" checked={cp} onChange={(e) => setCp(e.target.checked)} />
          <span>
            <strong>Folding guide</strong>
            <small>The full crease pattern, drawn to size on the square you fold.</small>
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={sheet} onChange={(e) => setSheet(e.target.checked)} />
          <span>
            <strong>Step-by-step sheet</strong>
            <small>Every step as a numbered diagram with its fold lines.</small>
          </span>
        </label>
        <button className="primary" disabled={!cp && !sheet} onClick={() => onPrint({ cp, sheet })}>
          <I.Printer /> Print
        </button>
      </div>
    </div>
  );
}

function PrintSheet({ model, built, opts, color }) {
  const flat = flatFinal(built);
  const creases = useMemo(() => creasePattern(flat), [flat]);
  return (
    <div className="print-root" aria-hidden="true">
      {opts.cp && (
        <section className="print-page">
          <header className="print-head">
            <h1>{model.name}</h1>
            <p>Folding guide for a {paperLabel(model)}. Print at 100% (actual size), then cut along the outer square.</p>
          </header>
          <div className="print-cp"><CreasePattern creases={creases} diamond={model.diamond} /></div>
          <div className="print-scale">
            <svg width="50mm" height="4mm" viewBox="0 0 50 4"><path d="M0 0v4M50 0v4M0 2h50" stroke="#111" strokeWidth="0.4" fill="none" /></svg>
            <span>This bar should measure 5 cm. If it doesn&rsquo;t, turn off &ldquo;fit to page&rdquo; in your print settings.</span>
          </div>
          <div className="print-legend">
            <span><svg width="46" height="8"><line x1="0" y1="4" x2="46" y2="4" stroke="#1f6fd1" strokeWidth="2" strokeDasharray="7 4" /></svg> Valley: folds toward you</span>
            <span><svg width="46" height="8"><line x1="0" y1="4" x2="46" y2="4" stroke="#d23c3c" strokeWidth="2" strokeDasharray="10 3 2 3" /></svg> Mountain: folds away from you</span>
          </div>
          <p className="print-note">
            Lines are drawn as seen from the printed side. Pre-crease every line first, then follow the step sheet. The printed side is the coloured side in the 3D model.
          </p>
        </section>
      )}
      {opts.sheet && (
        <section className="print-page print-steps">
          <header className="print-head">
            <h1>{model.name}, step by step</h1>
            <p>{built.steps.length} steps. You need a {paperLabel(model)}. Coloured side shown in tone, white side in white.</p>
          </header>
          <ol className="print-grid">
            {built.steps.map((s, i) => (
              <li key={i}>
                <Diagram state={s.before} lines={stepLines(s)} color={color} className="print-diagram" />
                <div>
                  <strong>{i + 1}. {s.title}</strong>
                  <span className="print-kind">{KIND[s.kind]?.label}</span>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
            <li>
              <Diagram state={flat} color={color} className="print-diagram" />
              <div><strong>Finished</strong><p>Shape it gently and give it a name.</p></div>
            </li>
          </ol>
        </section>
      )}
    </div>
  );
}

export default function App() {
  const [modelId, setModelId] = useState(MODELS[0].id);
  const model = MODELS.find((m) => m.id === modelId);
  const built = getBuilt(model);
  const [color, setColor] = useState(model.color);
  const [showCreases, setShowCreases] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printOpts, setPrintOpts] = useState({ cp: true, sheet: true });
  const viewer = useRef();
  const nav = useStepNav(built);
  const thumbs = useMemo(() => MODELS.map((m) => ({ m, flat: flatFinal(getBuilt(m)) })), []);

  useEffect(() => { player.set({ t: 0, playing: false, target: null, hold: 0 }); }, [modelId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select') && e.target.type !== 'range') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); nav.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); nav.prev(); }
      else if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); nav.toggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav.next, nav.prev, nav.toggle]);

  const doPrint = (opts) => {
    setPrintOpts(opts);
    setPrintOpen(false);
    setTimeout(() => window.print(), 80);
  };

  const done = nav.idx >= built.steps.length;
  const step = built.steps[Math.min(nav.idx, built.steps.length - 1)];
  const kind = KIND[step.kind] || KIND.valley;
  const listRef = useRef();
  useEffect(() => {
    const el = listRef.current?.querySelector('[aria-current="step"]');
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [nav.idx]);

  return (
    <>
      <div className="app" style={{ '--paper': color }}>
        <div className="stage">
          <Viewer ref={viewer} built={built} color={color} showCreases={showCreases} autoRotate={autoRotate} />
        </div>

        <header className="brand">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M4 26 16 4l12 22-12-6z" fill="var(--paper)" />
            <path d="M16 4v16l-12 6z" fill="#e8efe9" />
          </svg>
          <div>
            <span className="wordmark">orikata</span>
            <span className="tag">paper, folded in front of you</span>
          </div>
        </header>

        <nav className="models" aria-label="Models">
          <h2 className="panel-title">Choose a model</h2>
          <ul>
            {thumbs.map(({ m, flat }) => (
              <li key={m.id}>
                <button
                  className={`model-card ${m.id === modelId ? 'active' : ''}`}
                  aria-pressed={m.id === modelId}
                  onClick={() => { setModelId(m.id); setColor(m.color); }}
                >
                  <Diagram state={flat} color={m.id === modelId ? color : m.color} back="#e9ece8" stroke="#0a1412" className="thumb" />
                  <span className="model-text">
                    <span className="model-name">{m.name}</span>
                    <span className="model-meta">{m.level}, {getBuilt(m).steps.length} steps</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="model-blurb">{model.blurb}</p>
          <div className="paper-spec">
            <span className="paper-chip" aria-hidden="true" />
            <span>
              <strong>{paperLabel(model)}</strong>
              <small>{model.paper.note}</small>
            </span>
          </div>
        </nav>

        <aside className="steps" aria-label="Instructions">
          <div className="step-card" aria-live="polite">
            {done ? (
              <>
                <div className="step-count">Finished</div>
                <h1 className="step-title">Your {model.name.toLowerCase()} is folded</h1>
                <p className="step-text">Drag to turn it around, or print the folding guide and make one for real from a {paperLabel(model)}.</p>
                <div className="done-actions">
                  <button className="primary" onClick={() => setPrintOpen(true)}><I.Printer /> Print with guidelines</button>
                  <button className="ghost" onClick={() => player.set({ t: 0, playing: false, target: null })}><I.Restart /> Start over</button>
                </div>
              </>
            ) : (
              <>
                <div className="step-count">
                  <span className="big">{String(nav.idx + 1).padStart(2, '0')}</span>
                  <span>of {built.steps.length}</span>
                </div>
                <h1 className="step-title">{step.title}</h1>
                <p className="step-text">{step.text}</p>
                <div className="kind">
                  <span className={`kind-glyph k-${step.kind}`} aria-hidden="true" />
                  <span><strong>{kind.label}</strong> {kind.hint}</span>
                </div>
              </>
            )}
          </div>
          <ol className="step-list" ref={listRef}>
            {built.steps.map((s, i) => (
              <li key={i}>
                <button
                  className={`step-row ${i < nav.idx ? 'done' : ''}`}
                  aria-current={i === nav.idx ? 'step' : undefined}
                  onClick={() => nav.goto(i)}
                >
                  <span className="n">{i + 1}</span>
                  <span className="t">{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div className="dock">
          <div className="transport">
            <button className="icon-btn" onClick={nav.prev} aria-label="Previous step" title="Previous step (←)"><I.Prev /></button>
            <button className="play" onClick={nav.toggle} aria-label={nav.playing ? 'Pause' : 'Play all steps'} title="Play (space)">
              {nav.playing ? <I.Pause /> : <I.Play />}
            </button>
            <button className="icon-btn" onClick={nav.next} aria-label="Next step" title="Next step (→)"><I.Next /></button>
            <Timeline built={built} nav={nav} />
            <SpeedPicker />
          </div>
        </div>

        <div className="tools">
          <div className="swatches" role="radiogroup" aria-label="Paper colour">
            {PAPERS.map((p) => (
              <button
                key={p.hex}
                role="radio"
                aria-checked={color === p.hex}
                aria-label={p.name}
                title={p.name}
                className="swatch"
                style={{ background: p.hex }}
                onClick={() => setColor(p.hex)}
              />
            ))}
          </div>
          <button className={`icon-btn ${showCreases ? 'on' : ''}`} aria-pressed={showCreases} onClick={() => setShowCreases((v) => !v)} title="Show creases"><I.Lines /></button>
          <button className={`icon-btn ${autoRotate ? 'on' : ''}`} aria-pressed={autoRotate} onClick={() => setAutoRotate((v) => !v)} title="Spin the model"><I.Rotate /></button>
          <button className="icon-btn" onClick={() => viewer.current?.reset()} title="Reset view" aria-label="Reset view"><I.Target /></button>
          <button className="print-btn" onClick={() => setPrintOpen(true)} aria-label="Print"><I.Printer /> <span className="label">Print</span></button>
        </div>

        <p className="hint">Drag to rotate, scroll to zoom, right-drag to pan</p>

        <PrintDialog open={printOpen} onClose={() => setPrintOpen(false)} onPrint={doPrint} model={model} />
      </div>
      <PrintSheet model={model} built={built} opts={printOpts} color={color} />
    </>
  );
}

function SpeedPicker() {
  const speed = usePlayer((s) => s.speed);
  const opts = [0.5, 1, 2];
  return (
    <div className="speed" role="radiogroup" aria-label="Speed">
      {opts.map((o) => (
        <button key={o} role="radio" aria-checked={speed === o} className={speed === o ? 'on' : ''} onClick={() => player.set({ speed: o })}>
          {o}×
        </button>
      ))}
    </div>
  );
}
