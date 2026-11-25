const s = Math.SQRT2;
const t = (2 * s) / (2 + s); // 0.8284
const top = [[-1, t], [1, t]];

export default {
  id: 'cup',
  name: 'Paper cup',
  blurb: 'Six folds, and it really holds water. A good warm-up.',
  level: 'Beginner',
  color: '#e9a23b',
  size: 2,
  diamond: true,
  startFlipped: true,
  steps: [
    {
      title: 'Fold in half',
      text: 'With the white side up, fold the bottom corner up to the top corner.',
      kind: 'valley',
      ops: [{ line: [[s, 0], [-s, 0]], pick: [0, -0.5], select: 'all' }],
    },
    {
      title: 'Fold the right corner across',
      text: 'Bring the right corner to the left edge so the bottom of the flap sits level.',
      kind: 'valley',
      ops: [{ line: [[s - t, t], [0.243, 0]], pick: [1.2, 0.1] }],
    },
    {
      title: 'Fold the left corner across',
      text: 'Bring the left corner over to the right edge in the same way.',
      kind: 'valley',
      ops: [{ line: [[-0.243, 0], [-(s - t), t]], pick: [-1.2, 0.1] }],
    },
    {
      title: 'Fold the front flap down',
      text: 'Fold the top point of the front layer down over the front.',
      kind: 'valley',
      ops: [{ line: top, pick: [0, 1.2] }],
    },
    {
      title: 'Fold the back flap down',
      text: 'Fold the remaining point down behind the cup.',
      kind: 'mountain',
      ops: [{ kind: 'mountain', line: top, pick: [0, 1.2], select: 'bottom' }],
    },
    {
      title: 'Open the cup',
      text: 'Squeeze the sides gently so the pocket opens.',
      kind: 'shape',
      ops: [{
        type: 'shape',
        rotations: [
          { line: [[-1, 0], [1, 0]], angle: 14, pick: (c, i) => i.height >= i.depth },
          { line: [[-1, 0], [1, 0]], angle: -14, pick: (c, i) => i.height < i.depth },
        ],
      }],
    },
  ],
};
