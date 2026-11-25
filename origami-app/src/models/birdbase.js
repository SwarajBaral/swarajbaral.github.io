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

export const birdBaseSteps = [
  {
    title: 'Fold in half',
    text: 'Start white side up with the paper turned like a diamond. Fold the top corner down to the bottom corner to make a triangle.',
    kind: 'valley',
    ops: [{ line: [[-s, 0], [s, 0]], pick: [0, 0.5], select: 'all' }],
  },
  {
    title: 'Reverse fold the left corner',
    text: 'Push the left corner inside, between the two layers, along a line from the top middle down to the lower edge. The corner lands on the bottom point.',
    kind: 'inside',
    ops: [{ kind: 'inside', line: [[0, 0], [-s / 2, -s / 2]], pick: [-1, -0.1] }],
  },
  {
    title: 'Reverse fold the right corner',
    text: 'Do the same on the right. You now have a square base: a small diamond with the open end at the bottom.',
    kind: 'inside',
    ops: [{ kind: 'inside', line: [[0, 0], [s / 2, -s / 2]], pick: [1, -0.1] }],
  },
  {
    title: 'Kite fold the front flaps',
    text: 'Fold the lower edges of the front layer in so they meet on the centre line.',
    kind: 'valley',
    ops: kites,
  },
  {
    title: 'Unfold the kite',
    text: 'Open both flaps again. Those creases guide the next move.',
    kind: 'unfold',
    ops: unkites,
  },
  {
    title: 'Petal fold',
    text: 'Lift the bottom corner of the front layer up along the horizontal crease. The sides collapse inwards along the kite creases and meet in the middle.',
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
    title: 'Kite fold the back',
    text: 'Repeat the kite folds on this side.',
    kind: 'valley',
    ops: kites,
  },
  {
    title: 'Unfold the kite',
    text: 'Open the flaps again to leave the creases.',
    kind: 'unfold',
    ops: unkites,
  },
  {
    title: 'Petal fold the back',
    text: 'Lift the bottom corner up and collapse the sides inwards. This is the bird base.',
    kind: 'petal',
    ops: [petal('wingB')],
  },
  {
    title: 'Narrow the legs',
    text: 'Fold the lower edges of the top layers to the centre line to make the bottom flaps thin.',
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
    text: 'Fold these lower edges to the centre as well.',
    kind: 'valley',
    ops: narrow,
  },
];
