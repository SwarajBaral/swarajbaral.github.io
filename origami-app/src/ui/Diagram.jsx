import React from 'react';
import { folded, lineExtent } from '../engine/fold.js';
import { det } from '../engine/geom.js';

const LINE_STYLE = {
  valley: { dash: '0.07 0.05', label: 'Valley' },
  mountain: { dash: '0.09 0.035 0.015 0.035', label: 'Mountain' },
};

export function boundsOf(faces) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of faces) for (const [x, y] of folded(f)) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

function clip(line, b, pad) {
  const [p, q] = line;
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const ext = Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2 + pad;
  const tc = (cx - p[0]) * ux + (cy - p[1]) * uy;
  return [[p[0] + ux * (tc - ext), p[1] + uy * (tc - ext)], [p[0] + ux * (tc + ext), p[1] + uy * (tc + ext)]];
}

// Flat drawing of a folded state, with optional fold lines for the next move.
export default function Diagram({ state, color = '#2fa58b', back = '#f4f1ea', lines = [], stroke = '#14211d', className, frame }) {
  const b = frame || boundsOf(state.faces);
  const pad = 0.14;
  const w = b.x1 - b.x0 + pad * 2, h = b.y1 - b.y0 + pad * 2;
  const side = Math.max(w, h);
  const vx = (b.x0 + b.x1) / 2 - side / 2, vy = -(b.y0 + b.y1) / 2 - side / 2;
  const sw = side / 220;
  return (
    <svg className={className} viewBox={`${vx} ${vy} ${side} ${side}`} role="img" aria-hidden="true">
      <g transform="scale(1,-1)">
        {state.faces.map((f) => (
          <polygon
            key={f.id}
            points={folded(f).map((p) => p.join(',')).join(' ')}
            fill={det(f.F) > 0 ? color : back}
            stroke={stroke}
            strokeOpacity="0.55"
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        ))}
        {lines.map((l, i) => {
          const [p, q] = lineExtent(state.faces, l.line, side * 0.03) || clip(l.line, b, 0.08);
          const st = LINE_STYLE[l.kind === 'mountain' ? 'mountain' : 'valley'];
          return (
            <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={l.color || '#ff5a3c'}
              strokeWidth={sw * 2.2} strokeDasharray={st.dash.split(' ').map((d) => d * side / 2.2).join(' ')} strokeLinecap="round" />
          );
        })}
      </g>
    </svg>
  );
}

export function CreasePattern({ creases, diamond, valley = '#1f6fd1', mountain = '#d23c3c' }) {
  const r = (p) => (diamond ? [(p[0] + p[1]) / Math.SQRT2, (p[1] - p[0]) / Math.SQRT2] : p);
  return (
    <svg viewBox="-1 -1 2 2" overflow="visible" className="cp-svg" role="img" aria-label="Crease pattern">
      <g transform="scale(1,-1)">
        <rect x="-1" y="-1" width="2" height="2" fill="#fff" stroke="#111" strokeWidth="0.006" />
        {creases.map((c, i) => {
          const a = r(c.a), b = r(c.b);
          const m = c.type === 'mountain';
          return (
            <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={m ? mountain : valley} strokeWidth="0.0065"
              strokeDasharray={m ? '0.05 0.018 0.008 0.018' : '0.035 0.022'} strokeLinecap="butt" />
          );
        })}
      </g>
    </svg>
  );
}
