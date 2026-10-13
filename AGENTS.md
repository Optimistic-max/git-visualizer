# Git Visualizer: rules for humans and AI tools

An interactive website that teaches git visually. Left side: a terminal where you type git commands. Right side: an animated commit graph that updates live. Later (v2): a VS Code extension that reuses the same graph on real projects.

Read `docs/SYSTEM_DESIGN.md` before changing the architecture.

## Who owns what

**Emmanuel (most of the build)**
- Engine: isomorphic-git practice repo, fixed author + fake clock, turns commands into events
- Command parsing and the terminal box
- Commit graph and all its animations (dots, labels, HEAD, merge, fast-forward)
- Pretend GitHub remote LOGIC: clone, push, bounce-back, two-step pull, bot teammate
- Merge preview
- Correctness tests against real `git log --graph --all`
- Event format (agreed with Samuel before anyone builds on it)

**Samuel (UI)**
- Design system: colors, fonts, spacing, component styles
- Landing page and overall page layout
- LOOK of the pretend GitHub panel only (the logic behind it is Emmanuel's)
- Lesson screens and caption styling
- Reviews Emmanuel's UI pull requests
- Builds against the fake event stream until the real engine is ready

**Shared:** CI setup, deploy, README, accessibility checks.

Important for AI tools: do NOT hand the graph, the engine, or the pretend GitHub logic to Samuel's side of the work. If a task touches both, split it along the lines above.

## Folder layout

- `packages/engine`: turns git commands into events. No UI code in here.
- `packages/graph`: takes events and snapshots and animates them. No git code in here.
- `apps/web`: the website. Pulls the two packages together.
- The event format (`packages/engine/src/events.ts`) is the contract between them. Changing it needs both people to agree.

## v1 commands (locked)

clone, add (working folder to staging; a small "Edit a file" button makes a file modified so there is something to add), commit, branch, checkout/switch, merge (fast-forward AND merge-commit versions), push (with bounce-back when rejected), pull (shown in two steps: fetch, then merge).

Animation and interaction rules live in `docs/ANIMATION_DESIGN.md`. Read it before building or changing any animation. The one-line version: dots are born, labels travel, copies fly. Dots never move after they are born.

v1.5 (in this order): replay, share links, reset, revert, conflict collision animation, rebase.
Do not build v1.5 features until v1 is shipped. Do design the event format so they can be added without breaking it.
Later, after v1: skins (see docs/ANIMATION_DESIGN.md). Do not build before v1 ships.

## Git accuracy rules (this is a teaching tool, so wrong git is a bug)

1. `git branch name` only adds a label on the current commit. It does not fork the line and does not move HEAD. The line forks when each branch gets its own new commit. `git switch -c` / `checkout -b` creates the label AND moves HEAD.
2. HEAD points at a branch. On commit, the branch label slides forward to the new dot and HEAD goes with it. HEAD does not hop by itself.
3. Merge: if the target branch has not moved since the branch point, it is a fast-forward. No new dot. The label slides forward. If both sides have new commits, create a merge commit with two parents.
4. Pull is two steps: first `origin/main` moves (fetch), then your `main` fast-forwards or merges.
5. Push moves `origin/main` to your newest commit once the remote accepts it. A push is rejected if the remote has commits you do not have. Caption: "Pull first, then push again."
6. Clone copies the whole history. Afterwards `main` and `origin/main` sit on the same newest commit and HEAD is on `main`.
7. Conflicts (v1.5): offer keep yours, keep theirs, or combine both. Never teach that a conflict means throwing one side away.
8. Rebase (v1.5) creates NEW commits. Old commits stay behind as faded ghosts and the new copies fly out of them. Every event that replaces commits with new copies carries an old-id to new-id map. Reset does not rewrite anything, it only moves a label backward.

## Deterministic commit IDs

A commit ID depends on author, time and parents. To make the same commands always give the same IDs:
- Always use one fixed author name and email.
- Use a fake clock that only counts up (1 second per call). Never call `Date.now()` inside the engine.
- Always run in UTC: pass `timezoneOffset: 0` with every author and committer.
- Pass the author, committer and timestamp explicitly on every commit and merge call.

Share links (v1.5) depend on this. Do not break it.

## Animation rules

- Every animation is real SVG/DOM elements that move. Never images swapping like a slideshow, never a recorded video.
- SVG and Motion: Motion's `layout` and `layoutId` do not work well on SVG elements. Animate SVG positions directly (`cx`/`cy` on a circle, or `x`/`y` on a `<motion.g>`) with springs, keyed by commit hash. Use `layoutId` only for HTML parts (caption, trays, panels). Dots never move after they are born, so edges are never reshaped, only drawn in once with `pathLength`.
- Every animation is a short list of named phases (see `docs/ANIMATION_DESIGN.md`). Elements look at the current phase to choose their old or new position. Do not chain `setTimeout` calls.
- The graph reacts to STATE, not to commands. It gets "snapshot before" and "snapshot after" and animates the difference. Each dot is keyed by its commit ID and each label by its name, so things slide from the old spot to the new spot instead of popping in.
- Replay (v1.5) feeds saved events through the exact same animation code.
- Respect `prefers-reduced-motion`: jump to the final state and keep the caption.
- Every event has a plain-English caption. Screen readers read it. The graph must work with the keyboard only.

## Colors and design tokens

- Colors, fonts and spacing live as CSS variables in one design file in `apps/web` (Samuel owns it). Suggested path: `apps/web/src/design/tokens.css`.
- The graph never hard-codes a color. It reads the variables by name. The agreed names are listed in `docs/ANIMATION_DESIGN.md` section 2.3. Changing a *value* (a different blue) needs no discussion. Adding or renaming a variable needs both people to agree.
- The *meaning* of each color is fixed: gold = HEAD only, violet = GitHub only, coral = refusal only, green = success only. Changing a meaning needs both people to agree and a doc update.

## Events and snapshots

- Every event carries a `snapshotAfter` (commits, parents, where each label points). Stepping backward later is just animating to the previous snapshot.
- Saved event lists carry a `formatVersion` so old share links keep working.

## Code style (important)

The people writing this are learning. Write the simplest code that works:
- Plain functions and plain objects. No clever one-liners, no fancy generics, no deep chains of `.map().filter().reduce()`.
- Short, clear variable names that say what the thing is.
- A comment above each non-obvious line explaining what it does and why.
- Small files. One job per file.
- When you add a file, add a short note at the top saying what it is for.

## Testing

- Vitest for engine and graph logic. Playwright for the site, in Chromium AND WebKit (Safari engine), on Linux CI.
- Compare structure, not text: commits, parents and branch pointers. Do not compare hash values or the ASCII output of `git log --graph`.

## Git workflow

- One branch per feature, small pull requests, Samuel reviews Emmanuel's UI PRs.
- AI tools must NOT run `git add`, `git commit` or `git push`. Emmanuel does these himself after reading each file.
