// Shared bird-base sequence (used by the dragon and the crane).
import { apply, reflection } from '../engine/geom.js';

export const s = Math.SQRT2;
export const k = s - 1; // 0.41421
const kx = (y) => (k * (y + s)) / (s - k); // x of the right kite crease at height y
export const X = [0.2688, -0.0628]; // where the narrowing crease meets the edge
export { apply, reflection };

const kites = [
  { line: [[0, -s], [k, -k]], pick: [0.6, -0.7] },
  { line: [[-k, -k], [0, -s]], pick: [-0.6, -0.7] },
];
const unkites = [
  { line: [[0, -s], [k, -k]], pick: [0.12, -0.6] },
  { line: [[-k, -k], [0, -s]], pick: [-0.12, -0.6] },
];

const petal = (tag) => ({
  type: 'complex',
  kind: 'petal',
  groups: [
    // the front flap swings up along the horizontal crease...
    { tag, line: [[-1, -k], [1, -k]], pick: [0, -1.3], select: (c, i) => c[1] < -k && i.depth === 0 && Math.abs(c[0]) < kx(c[1]) },
    // ...while its sides fold in along the kite creases
    { tag, line: [[0, -s], [k, -k]], pick: [0.5, -0.75], parent: 0, anim: 'down', select: (c, i) => c[1] < -k && i.depth === 0 && c[0] > kx(c[1]) },
    { tag, line: [[-k, -k], [0, -s]], pick: [-0.5, -0.75], parent: 0, anim: 'down', select: (c, i) => c[1] < -k && i.depth === 0 && c[0] < -kx(c[1]) },
    // inner layers collapse to the centre line
    { line: [[0, -s], [k, -k]], pick: [0.5, -0.75], select: (c, i) => c[1] < -k && i.depth === 1 && c[0] > kx(c[1]) },
    { line: [[-k, -k], [0, -s]], pick: [-0.5, -0.75], select: (c, i) => c[1] < -k && i.depth === 1 && c[0] < -kx(c[1]) },
  ],
});

const narrow = [
  { line: [[0, -s], X], pick: [0.25, -0.5] },
  { line: [[-X[0], X[1]], [0, -s]], pick: [-0.25, -0.5] },
];

const H = [[-1, -k], [1, -k]];

// fold, then fold straight back: leaves a crease
const precrease = (line, pick, back) => [
  { line, pick, select: 'all', keep: true },
  { line, pick: back, keep: true },
];

// Collapse the pre-creased square into a square (preliminary) base.
// Top half swings down; the left and right corners tuck in between the layers.
const collapse = {
  type: 'complex',
  kind: 'collapse',
  groups: [
    { line: [[-s, 0], [s, 0]], pick: [0, 0.5], select: (c) => c[1] > 0 },
    { line: [[0, 0], [-s / 2, s / 2]], pick: [-1, 0.2], parent: 0, select: (c) => c[1] > 0 && c[0] < 0 && c[1] < -c[0] },
    { line: [[0, 0], [s / 2, s / 2]], pick: [1, 0.2], parent: 0, select: (c) => c[1] > 0 && c[0] > 0 && c[1] < c[0] },
    { line: [[0, 0], [-s / 2, -s / 2]], pick: [-1, -0.2], select: (c) => c[1] < 0 && c[0] < 0 && c[1] > c[0] },
    { line: [[0, 0], [s / 2, -s / 2]], pick: [1, -0.2], select: (c) => c[1] < 0 && c[0] > 0 && c[1] > -c[0] },
  ],
};

export const birdBaseSteps = [
  {
    title: 'Crease both diagonals',
    text: 'Start with a 15 × 15 cm square, coloured side up, turned like a diamond. Fold it in half corner to corner and unfold, then fold and unfold the other way.',
    kind: 'valley',
    ops: [
      ...precrease([[-s, 0], [s, 0]], [0, 0.5], [0, -0.5]),
      ...precrease([[0, -s], [0, s]], [-0.5, 0.1], [0.5, 0.1]),
    ],
  },
  {
    title: 'Turn over',
    text: 'Flip the paper so the white side faces up.',
    kind: 'turn',
    ops: [{ type: 'flip' }],
  },
  {
    title: 'Crease side to side',
    text: 'Fold the paper in half edge to edge and unfold, in both directions.',
    kind: 'valley',
    ops: [
      ...precrease([[-s / 2, -s / 2], [s / 2, s / 2]], [-0.5, 0.3], [0.4, -0.2]),
      ...precrease([[-s / 2, s / 2], [s / 2, -s / 2]], [0.3, 0.5], [-0.45, -0.3]),
    ],
  },
  {
    title: 'Collapse into a square base',
    text: 'Bring the left and right corners down to meet the bottom corner, letting the paper fold along the creases. Flatten it into a small diamond: the square base.',
    kind: 'collapse',
    ops: [collapse],
  },
  {
    title: 'Fold the edges to the centre',
    text: 'Fold the left and right lower edges of the top layer in to meet the vertical centre line.',
    kind: 'valley',
    ops: kites,
  },
  {
    title: 'Fold the top down',
    text: 'Fold the top corner down over the flaps, along the line where their top edges sit.',
    kind: 'valley',
    ops: [{ line: H, pick: [0, -0.15] }],
  },
  {
    title: 'Unfold the last three folds',
    text: 'Open the top corner and both side flaps again. You now have the creases for the petal fold.',
    kind: 'unfold',
    ops: [{ line: H, pick: [0, -0.68], keep: true }, ...unkites.map((o) => ({ ...o, keep: true }))],
  },
  {
    title: 'Petal fold',
    text: 'Lift the bottom corner of the top layer up along the horizontal crease. The sides fold inward along the creases and meet at the centre line.',
    kind: 'petal',
    ops: [petal('wingA')],
  },
  {
    title: 'Turn over',
    text: 'Flip the model over from side to side.',
    kind: 'turn',
    ops: [{ type: 'flip' }],
  },
  {
    title: 'Crease the edges to the centre',
    text: 'Fold the lower edges to the centre line and unfold them again.',
    kind: 'valley',
    ops: [...kites, ...unkites.map((o) => ({ ...o, keep: true }))],
  },
  {
    title: 'Petal fold the back',
    text: 'Lift the bottom corner up and let the sides fold in, just as before. This is the bird base.',
    kind: 'petal',
    ops: [petal('wingB')],
  },
  {
    title: 'Narrow the bottom flaps',
    text: 'Fold the lower left and right edges of the top layer to the centre line. This makes the neck and tail thin.',
    kind: 'valley',
    ops: narrow,
  },
  {
    title: 'Turn over',
    text: 'Flip the model over again.',
    kind: 'turn',
    ops: [{ type: 'flip' }],
  },
  {
    title: 'Narrow the other side',
    text: 'Fold these lower edges to the centre line as well.',
    kind: 'valley',
    ops: narrow,
  },
];
