// 2D geometry helpers for the flat-fold engine.
// Affine transform: { a, b, c, d, e, f } => x' = a*x + b*y + e ; y' = c*x + d*y + f
export const EPS = 1e-7;

export const I = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

export function apply(M, [x, y]) {
  return [M.a * x + M.b * y + M.e, M.c * x + M.d * y + M.f];
}

export function compose(M, N) {
  // M ∘ N
  return {
    a: M.a * N.a + M.b * N.c,
    b: M.a * N.b + M.b * N.d,
    c: M.c * N.a + M.d * N.c,
    d: M.c * N.b + M.d * N.d,
    e: M.a * N.e + M.b * N.f + M.e,
    f: M.c * N.e + M.d * N.f + M.f,
  };
}

export function invert(M) {
  const det = M.a * M.d - M.b * M.c;
  const a = M.d / det, b = -M.b / det, c = -M.c / det, d = M.a / det;
  return { a, b, c, d, e: -(a * M.e + b * M.f), f: -(c * M.e + d * M.f) };
}

export const det = (M) => M.a * M.d - M.b * M.c;

export function reflection([px, py], [qx, qy]) {
  let ux = qx - px, uy = qy - py;
  const l = Math.hypot(ux, uy);
  ux /= l; uy /= l;
  const a = ux * ux - uy * uy, b = 2 * ux * uy, d = -a;
  return { a, b, c: b, d, e: px - (a * px + b * py), f: py - (b * px + d * py) };
}

export function rotation([cx, cy], ang) {
  const co = Math.cos(ang), si = Math.sin(ang);
  return { a: co, b: -si, c: si, d: co, e: cx - (co * cx - si * cy), f: cy - (si * cx + co * cy) };
}

export function sameT(M, N, eps = 1e-6) {
  return (
    Math.abs(M.a - N.a) < eps && Math.abs(M.b - N.b) < eps && Math.abs(M.c - N.c) < eps &&
    Math.abs(M.d - N.d) < eps && Math.abs(M.e - N.e) < eps && Math.abs(M.f - N.f) < eps
  );
}

// signed distance of point from directed line p->q (positive = left)
export function side([px, py], [qx, qy], [x, y]) {
  const dx = qx - px, dy = qy - py;
  return (dx * (y - py) - dy * (x - px)) / Math.hypot(dx, dy);
}

export function area(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

export function centroid(poly) {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    const cr = x1 * y2 - x2 * y1;
    a += cr; cx += (x1 + x2) * cr; cy += (y1 + y2) * cr;
  }
  if (Math.abs(a) < 1e-12) {
    const n = poly.length;
    return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n];
  }
  return [cx / (3 * a), cy / (3 * a)];
}

// split convex polygon by line p->q. returns [left, right] or null when not crossing.
export function splitPoly(poly, p, q, eps = 1e-6) {
  const d = poly.map((v) => side(p, q, v));
  let pos = false, neg = false;
  for (const v of d) { if (v > eps) pos = true; if (v < -eps) neg = true; }
  if (!(pos && neg)) return null;
  const L = [], R = [];
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    const a = poly[i], b = poly[j], da = d[i], db = d[j];
    if (da >= -eps) L.push(a);
    if (da <= eps) R.push(a);
    if ((da > eps && db < -eps) || (da < -eps && db > eps)) {
      const t = da / (da - db);
      const m = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      L.push(m); R.push(m);
    }
  }
  const clean = (P) => P.filter((v, i) => {
    const w = P[(i + 1) % P.length];
    return Math.hypot(v[0] - w[0], v[1] - w[1]) > 1e-9;
  });
  const l = clean(L), r = clean(R);
  if (l.length < 3 || r.length < 3) return null;
  if (Math.abs(area(l)) < 1e-9 || Math.abs(area(r)) < 1e-9) return null;
  return [l, r];
}

export function bbox(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

// convex polygons area overlap (separating axis)
export function overlaps(A, B, eps = 1e-5) {
  for (const P of [A, B]) {
    for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length];
      let nx = y1 - y2, ny = x2 - x1;
      const l = Math.hypot(nx, ny);
      if (l < 1e-12) continue;
      nx /= l; ny /= l;
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const [x, y] of A) { const s = x * nx + y * ny; if (s < amin) amin = s; if (s > amax) amax = s; }
      for (const [x, y] of B) { const s = x * nx + y * ny; if (s < bmin) bmin = s; if (s > bmax) bmax = s; }
      if (Math.min(amax, bmax) - Math.max(amin, bmin) < eps) return false;
    }
  }
  return true;
}

export function contains(poly, pt, eps = 1e-9) {
  let sgn = 0;
  for (let i = 0; i < poly.length; i++) {
    const s = side(poly[i], poly[(i + 1) % poly.length], pt);
    if (Math.abs(s) < eps) continue;
    const c = s > 0 ? 1 : -1;
    if (sgn === 0) sgn = c; else if (c !== sgn) return false;
  }
  return true;
}

// shared collinear segment between two polygons (CP coords). returns [p, q] or null
export function sharedEdge(A, B, eps = 1e-6) {
  for (let i = 0; i < A.length; i++) {
    const a1 = A[i], a2 = A[(i + 1) % A.length];
    const dx = a2[0] - a1[0], dy = a2[1] - a1[1];
    const L = Math.hypot(dx, dy);
    if (L < 1e-12) continue;
    const ux = dx / L, uy = dy / L;
    for (let j = 0; j < B.length; j++) {
      const b1 = B[j], b2 = B[(j + 1) % B.length];
      const s1 = (ux * (b1[1] - a1[1]) - uy * (b1[0] - a1[0]));
      const s2 = (ux * (b2[1] - a1[1]) - uy * (b2[0] - a1[0]));
      if (Math.abs(s1) > eps || Math.abs(s2) > eps) continue;
      const t1 = (b1[0] - a1[0]) * ux + (b1[1] - a1[1]) * uy;
      const t2 = (b2[0] - a1[0]) * ux + (b2[1] - a1[1]) * uy;
      const lo = Math.max(0, Math.min(t1, t2)), hi = Math.min(L, Math.max(t1, t2));
      if (hi - lo > 1e-5) {
        return [[a1[0] + ux * lo, a1[1] + uy * lo], [a1[0] + ux * hi, a1[1] + uy * hi]];
      }
    }
  }
  return null;
}
