// Flat-fold simulator. Paper = list of convex faces (polygons in crease-pattern
// coordinates) each with an isometry F mapping it into the folded plane, ordered
// bottom -> top. Every fold splits the faces crossed by the fold line, picks the
// physically connected flap, reflects it and restacks the layers.
import {
  I, apply, compose, invert, det, reflection, rotation, side, centroid, splitPoly,
  bbox, overlaps, contains, sharedEdge, sameT,
} from './geom.js';

let NEXT_ID = 1;
const newFace = (poly, F, parent = null) => ({ id: NEXT_ID++, poly, F, parent, tag: parent ? parent.tag : undefined });

export const folded = (f) => f.poly.map((v) => apply(f.F, v));

// local stacking height of every face (longest chain of overlapping faces below it)
export function computeZ(faces) {
  const polys = faces.map(folded);
  const boxes = polys.map(bbox);
  const z = new Array(faces.length).fill(0);
  for (let i = 0; i < faces.length; i++) {
    let m = -1;
    const bi = boxes[i];
    for (let j = 0; j < i; j++) {
      if (z[j] <= m) continue;
      const bj = boxes[j];
      if (bj[0] >= bi[2] - 1e-5 || bj[2] <= bi[0] + 1e-5 || bj[1] >= bi[3] - 1e-5 || bj[3] <= bi[1] + 1e-5) continue;
      if (overlaps(polys[i], polys[j])) m = z[j];
    }
    z[i] = m + 1;
  }
  return z;
}

function stateBounds(faces) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of faces) for (const [x, y] of folded(f)) {
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

function adjacency(faces, ids) {
  // ids: indices to consider; returns map idx -> [{j, seg}]
  const adj = new Map(ids.map((i) => [i, []]));
  const boxes = new Map(ids.map((i) => [i, bbox(faces[i].poly)]));
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) {
      const i = ids[a], j = ids[b];
      const bi = boxes.get(i), bj = boxes.get(j);
      if (bj[0] > bi[2] + 1e-6 || bj[2] < bi[0] - 1e-6 || bj[1] > bi[3] + 1e-6 || bj[3] < bi[1] - 1e-6) continue;
      const seg = sharedEdge(faces[i].poly, faces[j].poly);
      if (seg) { adj.get(i).push({ j, seg }); adj.get(j).push({ j: i, seg }); }
    }
  }
  return adj;
}

export function createPaper(model = {}) {
  const s = (model.size || 2) / 2;
  const poly = model.diamond
    ? [[s * Math.SQRT2, 0], [0, s * Math.SQRT2], [-s * Math.SQRT2, 0], [0, -s * Math.SQRT2]]
    : [[-s, -s], [s, -s], [s, s], [-s, s]];
  const F = model.startFlipped ? { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 } : I();
  return { faces: [newFace(poly, F)] };
}

function snapshot(state) {
  return state.faces.map((f) => ({ ...f }));
}

/**
 * Apply one atomic operation. Returns { state, atomic } where atomic describes the
 * animation from the previous state to the next.
 */
export function applyOp(state, op) {
  if (op.type === 'rotate' || op.type === 'flip') return applyWhole(state, op);
  if (op.type === 'shape') return applyShape(state, op);
  if (op.type === 'complex') return applyComplex(state, op);
  return applyFold(state, op);
}

function applyWhole(state, op) {
  const faces = snapshot(state);
  const b = stateBounds(faces);
  const z0 = computeZ(faces);
  let T, group, newFaces;
  if (op.type === 'rotate') {
    const ang = (op.angle * Math.PI) / 180;
    T = rotation([b.cx, b.cy], ang);
    group = { type: 'z', c: [b.cx, b.cy], angle: ang };
    newFaces = faces.map((f) => ({ ...f, F: compose(T, f.F) }));
  } else {
    // turn over around the vertical (or horizontal) axis through the centre
    const horizontal = op.axis === 'horizontal';
    const p = horizontal ? [b.cx - 1, b.cy] : [b.cx, b.cy - 1];
    const q = horizontal ? [b.cx + 1, b.cy] : [b.cx, b.cy + 1];
    T = reflection(p, q);
    const zmax = Math.max(0, ...z0);
    group = { type: 'line', p, q, angle: Math.PI, h: zmax / 2 };
    newFaces = faces.map((f) => ({ ...f, F: compose(T, f.F) })).reverse();
  }
  const zAfter = computeZ(newFaces);
  const zMap = new Map(newFaces.map((f, i) => [f.id, zAfter[i]]));
  const atomic = {
    faces: faces.map((f, i) => ({ id: f.id, poly: f.poly, F: f.F, z0: z0[i], z1: zMap.get(f.id), group: 0 })),
    groups: [group],
    line: null,
    bounds0: b,
    bounds1: stateBounds(newFaces),
    kind: op.type,
  };
  return { state: { faces: newFaces }, atomic };
}

function applyShape(state, op) {
  // non-flat posing (last step only). rotations: [{line:[p,q], angle(deg), pick: fn}]
  const { faces, pairs } = splitAll(state.faces, op.rotations.map((r) => r.line));
  const z = computeZ(faces);
  const info = stackInfo(faces);
  const b = stateBounds(faces);
  const groups = op.rotations.map((r) => ({
    type: 'line', p: r.line[0], q: r.line[1], angle: (r.angle * Math.PI) / 180, h: 0, noResidual: true,
  }));
  const gi = faces.map((f, i) => op.rotations.findIndex((r) => r.pick(info[i].c, info[i], f)));
  groups.forEach((g, k) => {
    const zs = faces.map((_, i) => i).filter((i) => gi[i] === k).map((i) => z[i]);
    g.h = zs.length ? (op.rotations[k].angle > 0 ? Math.min(...zs) - 0.5 : Math.max(...zs) + 0.5) : 0;
  });
  const atomic = {
    faces: faces.map((f, i) => ({ id: f.id, poly: f.poly, F: f.F, z0: z[i], z1: z[i], group: gi[i] })),
    groups,
    line: null,
    bounds0: b,
    bounds1: b,
    kind: 'shape',
  };
  return { state: { faces: mergePairs(faces, pairs), posed: true }, atomic };
}

function applyFold(state, op) {
  const [p, q] = op.line;
  const kind = op.kind || 'valley';
  const layer = op.layer || (kind === 'mountain' ? 'bottom' : kind === 'inside' ? 'inside' : kind === 'outside' ? 'outside' : 'top');
  const anim = op.anim || (kind === 'mountain' ? 'down' : 'up');

  // 1. split faces crossed by the line
  const faces = [];
  const splitPairs = [];
  for (const f of state.faces) {
    const Fi = invert(f.F);
    const parts = splitPoly(f.poly, apply(Fi, p), apply(Fi, q));
    if (parts) {
      const a = newFace(parts[0], f.F, f), b = newFace(parts[1], f.F, f);
      faces.push(a, b);
      splitPairs.push([a, b, f]);
    } else faces.push({ ...f });
  }
  const z0 = computeZ(faces);
  const cents = faces.map((f) => centroid(folded(f)));

  // 2. choose moving set
  const sgn = Math.sign(side(p, q, op.pick));
  if (!sgn) throw new Error('pick point lies on fold line');
  const region = op.region || (() => true);
  const cand = [];
  faces.forEach((f, i) => {
    if (side(p, q, cents[i]) * sgn > 1e-6 && region(cents[i], f, z0[i]) && (op.zmin === undefined || z0[i] >= op.zmin) && (op.zmax === undefined || z0[i] <= op.zmax)) cand.push(i);
  });
  let moving;
  const select = op.select || 'top';
  if (select === 'all') moving = new Set(cand);
  else {
    const candSet = new Set(cand);
    const atPick = cand.filter((i) => contains(folded(faces[i]), op.pick));
    if (!atPick.length) throw new Error(`no paper under pick point ${op.pick} (${op.label || ''})`);
    atPick.sort((a, b) => a - b);
    let seeds;
    if (select === 'top') seeds = [atPick[atPick.length - 1]];
    else if (select === 'bottom') seeds = [atPick[0]];
    else if (typeof select === 'number') seeds = select > 0 ? atPick.slice(-select) : atPick.slice(0, -select);
    else if (select.layers) seeds = select.layers.map((k) => atPick[k < 0 ? atPick.length + k : k]).filter((x) => x !== undefined);
    const adj = adjacency(faces, cand);
    moving = new Set(seeds);
    const stack = [...seeds];
    while (stack.length) {
      const i = stack.pop();
      for (const { j, seg } of adj.get(i)) {
        if (moving.has(j) || !candSet.has(j)) continue;
        const a = apply(faces[i].F, seg[0]), b = apply(faces[i].F, seg[1]);
        if (Math.abs(side(p, q, a)) < 1e-6 && Math.abs(side(p, q, b)) < 1e-6) continue; // hinge
        moving.add(j);
        stack.push(j);
      }
    }
  }
  if (!moving.size) throw new Error('nothing to fold: ' + (op.label || ''));

  // put the static half of a split face before its moving half so that
  // "inside" restacking can find the body layer a flap belongs to
  for (const [a, b] of splitPairs) {
    const ia = faces.indexOf(a), ib = faces.indexOf(b);
    if (moving.has(ia) && !moving.has(ib) && ib === ia + 1) {
      [faces[ia], faces[ib]] = [faces[ib], faces[ia]];
      [z0[ia], z0[ib]] = [z0[ib], z0[ia]];
      [cents[ia], cents[ib]] = [cents[ib], cents[ia]];
      moving.delete(ia); moving.add(ib);
    }
  }

  // 3. reflect moving faces
  const R = reflection(p, q);
  const after = faces.map((f, i) => (moving.has(i) ? { ...f, F: compose(R, f.F), tag: op.tag ?? f.tag } : f));

  // 4. restack
  const movIdx = [...moving].sort((a, b) => a - b);
  const rest = after.map((f, i) => i).filter((i) => !moving.has(i));
  let orderIdx;
  if (layer === 'top') orderIdx = [...rest, ...movIdx.slice().reverse()];
  else if (layer === 'bottom') orderIdx = [...movIdx.slice().reverse(), ...rest];
  else {
    const zs = movIdx.map((i) => z0[i]);
    const mid = (Math.min(...zs) + Math.max(...zs)) / 2;
    const lower = movIdx.filter((i) => z0[i] < mid || (z0[i] === mid && op.midLower));
    const upper = movIdx.filter((i) => !lower.includes(i));
    if (layer === 'outside') {
      orderIdx = [...lower.slice().reverse(), ...rest, ...upper.slice().reverse()];
    } else {
      const ref = lower.length ? lower[lower.length - 1] : upper[0];
      let pos = 0;
      for (let k = 0; k < rest.length; k++) if (rest[k] < ref) pos = k + 1;
      orderIdx = [...rest.slice(0, pos), ...lower.slice().reverse(), ...upper.slice().reverse(), ...rest.slice(pos)];
    }
  }
  const ordered = orderIdx.map((i) => after[i]);
  const z1 = computeZ(ordered);
  const z1Map = new Map(ordered.map((f, i) => [f.id, z1[i]]));
  const zm = movIdx.map((i) => z0[i]);
  const h = (Math.min(...zm) + Math.max(...zm)) / 2;

  const atomic = {
    faces: faces.map((f, i) => ({
      id: f.id, poly: f.poly, F: f.F, z0: z0[i], z1: z1Map.get(f.id), group: moving.has(i) ? 0 : -1,
    })),
    groups: [{
      type: 'line', p, q, h,
      angle: Math.PI * (anim === 'up' ? 1 : -1) * sgn,
    }],
    line: [p, q],
    kind,
    bounds0: stateBounds(faces),
    bounds1: stateBounds(ordered),
  };

  // 5. merge split halves that ended up with the same transform
  const merged = mergePairs(ordered, splitPairs);
  return { state: { faces: merged }, atomic };
}

function mergePairs(list, pairs) {
  let merged = list.slice();
  for (let n = pairs.length - 1; n >= 0; n--) {
    const [a, b, parent] = pairs[n];
    const ia = merged.findIndex((f) => f.id === a.id);
    const ib = merged.findIndex((f) => f.id === b.id);
    if (ia < 0 || ib < 0) continue;
    if (sameT(merged[ia].F, merged[ib].F)) {
      const keep = Math.min(ia, ib), drop = Math.max(ia, ib);
      merged[keep] = { ...parent, F: merged[ia].F, tag: merged[ia].tag };
      merged.splice(drop, 1);
    }
  }
  return merged;
}

function splitAll(faceList, lines) {
  let faces = faceList.map((f) => ({ ...f }));
  const pairs = [];
  for (const [p, q] of lines) {
    const next = [];
    for (const f of faces) {
      const Fi = invert(f.F);
      const parts = splitPoly(f.poly, apply(Fi, p), apply(Fi, q));
      if (parts) {
        const a = newFace(parts[0], f.F, f), b = newFace(parts[1], f.F, f);
        next.push(a, b);
        pairs.push([a, b, f]);
      } else next.push(f);
    }
    faces = next;
  }
  return { faces, pairs };
}

// depth (# of faces above) and height (# below) covering each face's centroid
function stackInfo(faces) {
  const polys = faces.map(folded);
  const cents = polys.map(centroid);
  return faces.map((f, i) => {
    let above = 0, below = 0;
    for (let j = 0; j < faces.length; j++) {
      if (j === i || !contains(polys[j], cents[i])) continue;
      if (j > i) above++; else below++;
    }
    return { c: cents[i], depth: above, height: below };
  });
}

// Complex fold (petal, squash...): hinge groups, each reflecting its faces about a
// line, children move with their parents.
function applyComplex(state, op) {
  const { faces, pairs } = splitAll(state.faces, op.groups.map((g) => g.line));
  const z0 = computeZ(faces);
  const info = stackInfo(faces);
  const gi = faces.map((f, i) => {
    let g = -1;
    op.groups.forEach((G, k) => { if (G.select(info[i].c, info[i], f)) g = k; });
    return g;
  });
  const chain = (g) => { const c = []; while (g !== undefined && g >= 0) { c.push(g); g = op.groups[g].parent; } return c; };
  // heights & signs
  const groups = op.groups.map((G) => ({ ...G }));
  const members = (k) => faces.map((_, i) => i).filter((i) => chain(gi[i]).includes(k));
  const zSim = z0.slice();
  // innermost groups first: process groups in reverse definition order
  const orderG = groups.map((_, k) => k).sort((a, b) => chain(b).length - chain(a).length);
  for (const k of orderG) {
    const G = groups[k];
    const mem = members(k);
    if (!mem.length) throw new Error('empty group ' + k + ' ' + (op.label || ''));
    const zs = mem.map((i) => zSim[i]);
    const up = (G.anim || 'up') === 'up';
    G.h = up ? Math.max(...zs) + 0.5 : Math.min(...zs) - 0.5;
    // axis heights for the 3D animation use the starting heights
    const zs0 = mem.map((i) => z0[i]);
    G.h3 = up ? Math.max(...zs0) + 0.5 : Math.min(...zs0) - 0.5;
    for (const i of mem) zSim[i] = 2 * G.h - zSim[i];
    const sgn = Math.sign(side(G.line[0], G.line[1], G.pick));
    G.sgn = sgn;
  }
  const after = faces.map((f, i) => {
    let F = f.F;
    for (const k of chain(gi[i])) F = compose(reflection(...groups[k].line), F);
    const tag = gi[i] >= 0 && groups[gi[i]].tag ? groups[gi[i]].tag : f.tag;
    return gi[i] >= 0 ? { ...f, F, tag } : f;
  });
  const idx = faces.map((_, i) => i).sort((a, b) => zSim[a] - zSim[b] || a - b);
  const ordered = idx.map((i) => after[i]);
  const z1 = computeZ(ordered);
  const z1Map = new Map(ordered.map((f, i) => [f.id, z1[i]]));
  const atomic = {
    faces: faces.map((f, i) => ({ id: f.id, poly: f.poly, F: f.F, z0: z0[i], z1: z1Map.get(f.id), group: gi[i] })),
    groups: groups.map((G) => ({
      type: 'line', p: G.line[0], q: G.line[1], h: G.h3, parent: G.parent,
      angle: Math.PI * ((G.anim || 'up') === 'up' ? 1 : -1) * G.sgn,
    })),
    line: op.groups[0].line,
    lines: op.groups.map((g) => g.line),
    kind: op.kind || 'petal',
    bounds0: stateBounds(faces),
    bounds1: stateBounds(ordered),
  };
  return { state: { faces: mergePairs(ordered, pairs) }, atomic };
}

// returns list of torn edges (adjacent faces whose shared edge no longer coincides)
export function validate(state) {
  const faces = state.faces;
  const ids = faces.map((_, i) => i);
  const adj = adjacency(faces, ids);
  const bad = [];
  for (const i of ids) for (const { j, seg } of adj.get(i)) {
    if (j < i) continue;
    const a1 = apply(faces[i].F, seg[0]), a2 = apply(faces[j].F, seg[0]);
    const b1 = apply(faces[i].F, seg[1]), b2 = apply(faces[j].F, seg[1]);
    if (Math.hypot(a1[0] - a2[0], a1[1] - a2[1]) > 1e-5 || Math.hypot(b1[0] - b2[0], b1[1] - b2[1]) > 1e-5) bad.push([i, j]);
  }
  return bad;
}

export function buildModel(model) {
  NEXT_ID = 1;
  let state = createPaper(model);
  const atomics = [];
  const steps = [];
  for (const step of model.steps) {
    const start = atomics.length;
    const before = state;
    for (const op of step.ops) {
      const r = applyOp(state, op);
      state = r.state;
      r.atomic.step = steps.length;
      atomics.push(r.atomic);
    }
    steps.push({ ...step, start, end: atomics.length, before, after: state });
  }
  return { atomics, steps, final: state };
}

// crease pattern of the final flat state: [{a, b, type: 'valley'|'mountain'}] in CP coords
export function creasePattern(state) {
  const faces = state.faces;
  const ids = faces.map((_, i) => i);
  const adj = adjacency(faces, ids);
  const out = [];
  for (const i of ids) {
    for (const { j, seg } of adj.get(i)) {
      if (j < i) continue;
      if (sameT(faces[i].F, faces[j].F)) continue;
      const above = j > i; // j above i in stack
      const valley = above === det(faces[i].F) > 0;
      out.push({ a: seg[0], b: seg[1], type: valley ? 'valley' : 'mountain' });
    }
  }
  return out;
}

export { stateBounds };

// part of a fold line that actually crosses paper: returns [[x,y],[x,y]] or null
export function lineExtent(faces, [p, q], pad = 0.06) {
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  let lo = Infinity, hi = -Infinity;
  for (const f of faces) {
    const P = folded(f);
    // clip parametric line against convex polygon
    let t0 = -1e9, t1 = 1e9;
    const area2 = P.reduce((s, v, i) => { const w = P[(i + 1) % P.length]; return s + v[0] * w[1] - w[0] * v[1]; }, 0);
    const sg = area2 > 0 ? 1 : -1;
    let ok = true;
    for (let i = 0; i < P.length && ok; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      // inside: sg * cross(e, x - a) >= 0
      const num = sg * (ex * (p[1] - a[1]) - ey * (p[0] - a[0]));
      const den = sg * (ex * uy - ey * ux);
      if (Math.abs(den) < 1e-12) { if (num < -1e-9) ok = false; continue; }
      const t = -num / den;
      if (den > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    }
    if (ok && t1 - t0 > 1e-6) { lo = Math.min(lo, t0); hi = Math.max(hi, t1); }
  }
  if (lo > hi) return null;
  return [[p[0] + ux * (lo - pad), p[1] + uy * (lo - pad)], [p[0] + ux * (hi + pad), p[1] + uy * (hi + pad)]];
}
