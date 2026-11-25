import { birdBaseSteps, s, X, apply, reflection } from './birdbase.js';

const neckLine = [[0, -0.45], [-0.966, -0.709]];
const tailLine = [[0, -0.45], [0.866, -0.95]];
const onNeck = (p) => apply(reflection(...neckLine), p);
const onTail = (p) => apply(reflection(...tailLine), p);
const wingZone = ([x, y]) => y > -0.06 && Math.abs(x) < (X[0] * (2 - s - y)) / (2 - s - X[1]) + 0.01;
const notBody = (f) => f.tag !== 'neck' && f.tag !== 'tail';

export default {
  id: 'dragon',
  name: 'Dragon',
  blurb: 'A winged dragon on the classic bird base, with a hooked head and a curled tail.',
  level: 'Intermediate',
  color: '#2fa58b',
  size: 2,
  diamond: true,
  startFlipped: true,
  steps: [
    ...birdBaseSteps,
    {
      title: 'Reverse fold the neck',
      text: 'Push the left bottom flap up between the body layers so it points up and out. This becomes the neck.',
      kind: 'inside',
      ops: [{ kind: 'inside', tag: 'neck', line: neckLine, pick: [-0.05, -1.0] }],
    },
    {
      title: 'Reverse fold the tail',
      text: 'Push the right flap up between the layers at a lower angle for the tail.',
      kind: 'inside',
      ops: [{ kind: 'inside', tag: 'tail', line: tailLine, pick: [0.05, -1.1] }],
    },
    {
      title: 'Reverse fold the head',
      text: 'Near the tip of the neck, push the point inside so it hooks forward. That is the head.',
      kind: 'inside',
      ops: [{ kind: 'inside', tag: 'neck', line: [[-0.372, 0.194], [-1.278, 0.617]], pick: onNeck([-0.012, -1.33]) }],
    },
    {
      title: 'Curl the tail',
      text: 'Wrap the end of the tail outwards around itself so it flicks upward.',
      kind: 'outside',
      ops: [{ kind: 'outside', tag: 'tail', line: [[0.6185, -0.093], [1.1185, 0.773]], pick: onTail([0.012, -1.33]) }],
    },
    {
      title: 'Spread the wings',
      text: 'Pull the two large flaps away from each other so the wings open. Your dragon is done.',
      kind: 'shape',
      ops: [{
        type: 'shape',
        rotations: [
          { line: [[-1, -0.06], [1, -0.06]], angle: 72, pick: (c, i, f) => wingZone(c) && notBody(f) && i.height >= i.depth },
          { line: [[-1, -0.06], [1, -0.06]], angle: -72, pick: (c, i, f) => wingZone(c) && notBody(f) && i.height < i.depth },
        ],
      }],
    },
  ],
};
