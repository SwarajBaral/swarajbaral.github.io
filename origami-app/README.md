# Orikata

Interactive origami in the browser: a sheet of paper folds into a dragon (or a crane, or a cup) in 3D, one step at a time. Built with React, three.js and react-three-fiber.

```bash
npm install
npm run dev      # local dev server
npm run build    # writes the static site to ../origami (served at /origami/ on GitHub Pages)
```

## How it works

- `src/engine/` is a small flat-fold simulator. Paper is a list of convex faces, each with a 2D isometry into the folded plane and a stacking order. A fold splits the faces crossed by the fold line, picks the physically connected flap, reflects it and restacks the layers. Complex folds (petal folds) are described as hinge groups that move together.
- `src/models/` holds the fold sequences. Each op is written in the coordinates of the model as you see it.
- `src/three/` animates every fold as rigid rotations about the fold line and renders both sides of the paper.
- The print sheet is generated from the same data: the crease pattern of the finished model, and a diagram for every step.

`node tools/debug.mjs dragon` renders every step to `debug.html` and reports any torn paper.
