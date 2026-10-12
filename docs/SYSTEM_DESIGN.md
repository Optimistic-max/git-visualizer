# System Design: Git Visualizer

Status: draft v0, written Oct 12 2026. Emmanuel and Samuel agree on the event format first, then this document gets updated. There is no fixed timetable (see section 12).

## 1. Goal

Help beginners understand git by watching it happen. You type a git command on the left, and an animated commit graph on the right shows what that command really did. It runs entirely in the browser, so it is free to host and works on Windows and Mac.

Non-goals for v1: multiplayer, real GitHub accounts, real repos, rebase, reset, revert, merge conflicts, replay, share links.

## 2. The big picture

```
 apps/web (the site)
 ┌──────────────────────────────────────────────────────────┐
 │  Terminal box ──► Command parser                         │
 │                        │                                 │
 │                        ▼                                 │
 │                packages/engine                           │
 │      (isomorphic-git + lightning-fs, fake clock)         │
 │                        │                                 │
 │              GitEvent + snapshotAfter                    │
 │                        │                                 │
 │          ┌─────────────┼───────────────┐                 │
 │          ▼             ▼               ▼                 │
 │    packages/graph   Caption box   Pretend GitHub panel   │
 │    (animations)     (plain text)  (look = Samuel)        │
 └──────────────────────────────────────────────────────────┘
```

One rule makes this work: **the engine knows nothing about drawing, and the graph knows nothing about git.** The only thing passed between them is the event format.

## 3. Packages and who owns them

| Folder | Job | Owner |
|---|---|---|
| `packages/engine` | Runs commands on a practice repo, produces events | Emmanuel |
| `packages/graph` | Draws snapshots and animates between them | Emmanuel |
| `apps/web` | Page layout, terminal box wiring, caption, GitHub panel look, lessons | Samuel (look) and Emmanuel (terminal, wiring, GitHub logic) |
| `docs` | This design, later the lessons text | Shared |

## 4. The event contract

File: `packages/engine/src/events.ts`. This is the most important file in the project.

**Snapshot** = the full picture of both repos at one moment:
- `local`: every commit (id, parents, message), every branch label (`main`, `feature`), the remote-tracking labels (`origin/main`), which branch HEAD is on, the files in the working folder (each `clean` or `modified`), and which files are staged.
- `remote`: the pretend GitHub repo, with its commits and branch labels.

**Event** = what just happened, plus the snapshot after it. Event types for v1:

| Event | Meaning | Animation idea |
|---|---|---|
| `clone` | Practice repo copied down from the pretend GitHub | Every dot flows down; `main` and `origin/main` land on the newest dot |
| `edit` | A file in the working folder was changed (from the "Edit a file" button, not a git command) | The file chip gets its modified badge |
| `add` | Files moved into the staging box | A copy of the file chip flies from the working folder to staging |
| `commit` | New commit on the current branch | New dot drops in; branch label (with HEAD) slides forward |
| `branch-create` | New label on the current commit | Label appears on the dot. No fork yet |
| `checkout` | HEAD moves to another branch | HEAD marker slides to the other label |
| `merge` | `fastForward: true` or false | Fast-forward: label slides forward. Otherwise two lines flow into a new dot |
| `fetch` | `origin/main` label moves | Packets come down from GitHub; only `origin/main` moves |
| `push` | `accepted: true` or false | Accepted: packets fly up, both `origin/main` labels move. Rejected: packets bounce back |
| `remote-commit` | The bot teammate pushed to GitHub | Packets land on the GitHub side |

`pull` is not its own event. It is a `fetch` event followed by a `merge` event, which is exactly how git does it.

Reserved for later, so the format does not need to break: `conflict`, `rebase`, `reset`, `revert`. `rebase` creates new commits, so it will carry an `idMap` (old id to new id). `reset` does not rewrite anything, it only moves a branch label backward. `revert` adds a new commit that undoes an old one.

Every event has a `caption` (plain English, also read by screen readers), a `step` number, the `command` that was typed, and an optional `group` that ties events together (`fetch` + `merge` are one `pull`; `branch-create` + `checkout` are one `switch -c`). A saved list of events has a `formatVersion`.

## 5. Engine (`packages/engine`)

**Practice repo.** isomorphic-git running on lightning-fs (an in-browser filesystem). Two repos live in it: `/local` (the user's) and `/remote` (the pretend GitHub).

**Deterministic IDs.** One fixed author, and a fake clock that goes up by one second on every call. The author, committer and timestamp are passed explicitly on every commit and merge. Same commands in, same IDs out. This is required before share links can exist.

**Command parser.** Plain text in, a small object out, for example `{ command: "branch", args: ["feature"] }`. Unknown commands get a friendly "I don't support that yet" instead of an error. The parser is one big `switch`, kept simple on purpose.

**Running a command.** The flow is always:
1. Parse the text.
2. Take the snapshot before.
3. Run the isomorphic-git calls.
4. Take the snapshot after.
5. Build the event (type, details, caption, snapshotAfter) and return it.

**Pretend GitHub logic.** isomorphic-git's push and pull expect a real web server, so we write our own small version between `/local` and `/remote`:
- `push`: find commits the remote does not have, copy them over, then move the remote branch. Refuse if the remote tip is not an ancestor of your tip (that is the bounce-back).
- `fetch`: the same in reverse, and it only moves `origin/main`.
- `pull`: `fetch`, then `merge` of `origin/main` into your branch.
- `clone`: copy all history from `/remote` into `/local`, set `main` and `origin/main`.
- Bot teammate: a function that adds a commit to `/remote` on its own (a button or a timer in the lesson), emitting `remote-commit`. This is what creates the bounce-back moment.

**Merge preview.** Before running `merge`, work out whether it would be a fast-forward or need a merge commit (find the common ancestor and check whether the target moved). The terminal can show "this will be a fast-forward" before you press enter.

## 6. Graph (`packages/graph`)

**Core idea: state in, animation out.** The graph component receives a snapshot (and the event that produced it). It does not know what `merge` means. It compares the old snapshot with the new one and animates the difference.

**Layout is plain functions.** Every commit gets one column (in the order it first appears, the same on both shelves) and one lane (the first child of a commit stays on its parent's lane, a second child forks to a new lane). Dots never move once placed. The full rules, the two-shelf stage and every animation are in `ANIMATION_DESIGN.md`.

**Why this animates smoothly:** each dot is keyed by its commit id and each label by its name. When the snapshot changes, the same element gets a new position and Motion slides it there. New ids fade or drop in. Nothing is swapped like an image.

**Per-event touches** (small extras on top of the generic sliding): the drop for a new dot, the fork curve when a second commit lands on a branch, packets for push/fetch, the bounce-back, a glow on arrival.

**Drawn with** SVG elements and Motion (Framer Motion). The pause test: freeze mid-animation and you should see dots between their old and new spots.

**Accessibility:** under reduced motion, jump to the final positions. Dots are focusable with the keyboard (arrow keys move along the graph), and each shows its message and parents as text. The caption is in a live region so screen readers announce it.

## 7. Web app (`apps/web`)

- **Terminal box:** a simple input with command history (up and down arrows), not xterm.js. We only parse a handful of commands.
- **Layout (Samuel):** terminal on the left, graph on the right, caption under the graph, pretend GitHub panel at the top of the graph area.
- **Lessons (Samuel):** a list of guided steps, each one a command to type and a caption to show.
- **Pretend GitHub panel:** Samuel designs how it looks, Emmanuel feeds it the remote snapshot.
- **Samuel's workflow:** build everything against `fakeStream.ts` until the real engine is plugged in.

## 8. Testing

- **Engine (Vitest):** run commands, check the snapshot. Same commands twice must give the same commit ids.
- **Against real git:** run the same commands with real `git`, then compare commits, parents and branch pointers with `git log --graph --all` output parsed into data. Never compare hash values or ASCII text.
- **Graph (Vitest):** `layout()` is pure, so it is easy to test.
- **Site (Playwright):** type commands, check the caption and labels. Run in Chromium and WebKit (Safari's engine). WebKit matters because Safari treats browser storage differently.
- **Accessibility:** check reduced-motion behavior and keyboard-only use in Playwright.

## 9. CI and deploy

- GitHub Actions on Linux only: install, type-check, Vitest, Playwright (Chromium + WebKit).
- Manual check before each release on whatever machines you two have (Windows, Mac, a phone browser). Playwright's WebKit run covers Safari's engine even without a Mac.
- Static hosting on Vercel or GitHub Pages. No server. MIT license.

## 10. v1.5: replay and share links

Designed in now, built later.

- **Replay:** keep the list of events. Playing, stepping and dragging a slider all feed saved events through the same animation code. Stepping backward animates to the previous snapshot, so nobody has to work out how to undo a merge.
- **Share links:** save the event list (or just the commands) in the link, with `formatVersion`. No server needed. Works because ids are deterministic.
- **Other v1.5 items:** reset, revert, conflicts (keep yours / keep theirs / combine both), rebase with ghost dots.

## 11. Risks and the first spike

Spend about one day proving these before building on them:

1. **Copying commits between `/local` and `/remote`.** Confirm isomorphic-git lets us read and write objects directly (`readObject` / `writeObject` or similar). If not, the pretend GitHub needs another approach, and push/pull may slip out of v1.
2. **Deterministic ids.** Run the same commands twice and compare commit ids.
3. **`cherryPick`.** Run one to confirm the installed version behaves as the README says (needed for rebase later).
4. **Conflicts.** Merge with the `abortOnConflict: false` option and see what is written to the files (needed for the conflict feature later).
5. **WebKit.** Make sure lightning-fs works in Playwright's WebKit.

## 12. Build order (no fixed dates)

We are building freely, so there is no calendar. The order matters, the dates don't. One goal to keep in mind: ship the whole v1 command list (live, and linked from the resume) before starting anything from v1.5. Summer 2027 internship applications are open now, so a live v1 soon is worth more than a perfect one later.

| Step | Emmanuel | Samuel |
|---|---|---|
| 1 | Scaffold, spike, agree the event format, engine `edit` and `add` underneath `commit`, static graph from a snapshot (columns, lanes), commit animation | Design system, page layout, builds against the fake stream |
| 2 | Caption, speed control, replay this step, branch, checkout, both merges with preview, command input | Landing page, caption styling, tray look, GitHub panel look |
| 3 | Plug in the real engine, correctness tests | Lesson screens |
| 4 | Pretend GitHub logic (clone, push, bounce-back, fetch, two-step pull, bot) and its animations | Panel polish, reviews |
| 5 | `add` animation, keyboard graph, screen-reader text, reduced-motion polish | Landing polish. Shared: CI, deploy, README, accessibility checks |

If a step runs long, use the cut list in `ANIMATION_DESIGN.md` section 8.

## 13. v2: VS Code extension

Same graph package inside a webview. A small watcher reads the real `.git` folder (reflog, refs, packed-refs), turns changes into the same events, and feeds the same animation code. Multiplayer is optional and last.
