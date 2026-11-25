export const KIND = {
  valley: { label: 'Valley fold', hint: 'Fold toward you so a valley forms.' },
  mountain: { label: 'Mountain fold', hint: 'Fold away from you so a ridge forms.' },
  inside: { label: 'Inside reverse fold', hint: 'The point tucks in between the layers.' },
  outside: { label: 'Outside reverse fold', hint: 'The layers wrap around the outside.' },
  petal: { label: 'Petal fold', hint: 'One layer lifts while its sides collapse inward.' },
  turn: { label: 'Turn over', hint: 'Flip the model, left to right.' },
  unfold: { label: 'Unfold', hint: 'Open up again, keeping the crease.' },
  shape: { label: 'Shape', hint: 'Gently pose the finished model.' },
};

export const PAPERS = [
  { name: 'Jade', hex: '#2fa58b' },
  { name: 'Vermilion', hex: '#d94f5c' },
  { name: 'Saffron', hex: '#e9a23b' },
  { name: 'Indigo', hex: '#4b62d6' },
  { name: 'Plum', hex: '#8a4fbf' },
  { name: 'Graphite', hex: '#3c4248' },
];

export function stepLines(step) {
  const out = [];
  for (const op of step.ops) {
    if (op.line) out.push({ line: op.line, kind: op.kind === 'mountain' ? 'mountain' : 'valley' });
    if (op.groups) op.groups.slice(0, 3).forEach((g) => out.push({ line: g.line, kind: 'valley' }));
  }
  return out;
}

// last flat (unposed) state of a model, for drawings and the crease pattern
export function flatFinal(built) {
  for (let i = built.steps.length - 1; i >= 0; i--) {
    if (!built.steps[i].ops.some((o) => o.type === 'shape')) return built.steps[i].after;
  }
  return built.final;
}
