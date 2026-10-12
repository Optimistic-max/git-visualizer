# packages/graph

Takes snapshots and events from `packages/engine` and animates them (dots, labels, HEAD, flying copies).

Rules (see `AGENTS.md` and `docs/ANIMATION_DESIGN.md`):
- No git code in here. Only drawing and animation.
- Dots are born and never move. Labels travel. Copies fly.
- Each dot is keyed by its commit ID, each label by its name.
- Layout is plain functions: one column per commit (same on both shelves), one lane per commit (a second child forks to a new lane).
- Animate SVG positions directly (`cx`/`cy`, or `x`/`y` on a `motion.g`). Do not use `layoutId` on SVG.
- Every animation is a list of named phases.
- Respect reduced motion.

Owner: Emmanuel.
