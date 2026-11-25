// Renders each step's resulting flat state to an HTML page of SVGs for inspection.
import fs from 'node:fs';
import { buildModel, folded, computeZ, creasePattern } from '../src/engine/fold.js';
import { det } from '../src/engine/geom.js';
const name = process.argv[2] || 'dragon';
const upto = process.argv[3] ? +process.argv[3] : Infinity;
const mod = (await import(`../src/models/${name}.js`)).default;
const model = { ...mod, steps: mod.steps.slice(0, upto) };
const t0 = Date.now();
const { steps, atomics, final } = buildModel(model);
console.log('built', steps.length, 'steps', atomics.length, 'atomics in', Date.now() - t0, 'ms; faces', final.faces.length);
const svg = (state, lines = [], title = '') => {
  const S = 120;
  let out = `<svg viewBox="-2 -2 4 4" width="360" height="360" style="background:#222;margin:4px"><g transform="scale(1,-1)">`;
  for (let x = -2; x <= 2; x += 0.5) out += `<line x1="${x}" y1="-2" x2="${x}" y2="2" stroke="#444" stroke-width="0.005"/><line y1="${x}" x1="-2" y2="${x}" x2="2" stroke="#444" stroke-width="0.005"/>`;
  state.faces.forEach((f, i) => {
    const pts = folded(f).map((p) => p.join(',')).join(' ');
    const col = det(f.F) > 0 ? '#2fa58b' : '#eeeeee';
    out += `<polygon points="${pts}" fill="${col}" fill-opacity="0.85" stroke="#000" stroke-width="0.008"/>`;
  });
  for (const [p, q] of lines) out += `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="red" stroke-width="0.015" stroke-dasharray="0.05 0.03"/>`;
  out += `</g><text x="-1.9" y="-1.8" fill="#fff" font-size="0.13">${title}</text></svg>`;
  return out;
};
let html = '<body style="background:#111;color:#fff;font:12px sans-serif">';
steps.forEach((s, i) => {
  const lines = s.ops.filter((o) => o.line).map((o) => o.line);
  html += svg(s.before, lines, `${i + 1} before: ${s.title}`);
});
html += svg(final, [], 'final');
// crease pattern
const cp = creasePattern(final);
html += `<svg viewBox="-1.6 -1.6 3.2 3.2" width="360" height="360" style="background:#fff;margin:4px"><g transform="scale(1,-1)">`;
for (const c of cp) html += `<line x1="${c.a[0]}" y1="${c.a[1]}" x2="${c.b[0]}" y2="${c.b[1]}" stroke="${c.type === 'valley' ? 'blue' : 'red'}" stroke-width="0.01"/>`;
html += '</g></svg>';
fs.writeFileSync(new URL('../debug.html', import.meta.url), html);
const z = computeZ(final.faces);
console.log('max z', Math.max(...z));
import { validate } from '../src/engine/fold.js';
steps.forEach((s, i) => { const b = validate(s.after); if (b.length) console.log('TEAR after step', i + 1, s.title, b.length); });
