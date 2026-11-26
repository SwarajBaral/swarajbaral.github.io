import { birdBaseSteps, apply, reflection } from './birdbase.js';

const neckLine = [[0, -0.45], [-0.991, -0.581]];
const tailLine = [[0, -0.45], [0.991, -0.581]];
const neckTip = apply(reflection(...neckLine), [0, -Math.SQRT2]);
const dir = [Math.cos((105 * Math.PI) / 180), Math.sin((105 * Math.PI) / 180)];
const hp = [neckTip[0] - 0.2 * dir[0], neckTip[1] - 0.2 * dir[1]];
const ha = (152.5 * Math.PI) / 180;
const wingLine = [[-1, -0.0628], [1, -0.0628]];

export default {
  id: 'crane',
  name: 'Crane',
  blurb: 'The traditional Japanese orizuru, folded from the bird base with the classic reverse-folded neck and tail.',
  level: 'Easy',
  color: '#d94f5c',
  size: 2,
  paper: { cm: 15, inch: 6, note: 'Square origami paper (kami) or patterned chiyogami, coloured on one side.' },
  diamond: true,
  steps: [
    ...birdBaseSteps,
    {
      title: 'Reverse fold the neck',
      text: 'Push the left flap up inside the body so it stands almost upright.',
      kind: 'inside',
      ops: [{ kind: 'inside', tag: 'neck', line: neckLine, pick: [-0.05, -1.0] }],
    },
    {
      title: 'Reverse fold the tail',
      text: 'Do the same with the right flap.',
      kind: 'inside',
      ops: [{ kind: 'inside', tag: 'tail', line: tailLine, pick: [0.05, -1.0] }],
    },
    {
      title: 'Reverse fold the head',
      text: 'Push the tip of the neck inside to form the beak.',
      kind: 'inside',
      ops: [{
        kind: 'inside', tag: 'neck',
        line: [hp, [hp[0] + Math.cos(ha), hp[1] + Math.sin(ha)]],
        pick: apply(reflection(...neckLine), [-0.01, -1.34]),
      }],
    },
    {
      title: 'Fold the wings down',
      text: 'Fold the front wing down at the top of the body, then the back wing behind.',
      kind: 'valley',
      ops: [
        { line: wingLine, pick: [0, 0.4], tag: 'wingA' },
        { kind: 'mountain', line: wingLine, pick: [0, 0.4], select: 'bottom', tag: 'wingB' },
      ],
    },
    {
      title: 'Open the wings',
      text: 'Lift both wings out to the sides. Your crane is ready.',
      kind: 'shape',
      ops: [{
        type: 'shape',
        rotations: [
          { line: wingLine, angle: -85, pick: (c, i, f) => f.tag === 'wingA' && c[1] < -0.0628 },
          { line: wingLine, angle: 85, pick: (c, i, f) => f.tag === 'wingB' && c[1] < -0.0628 },
        ],
      }],
    },
  ],
};
