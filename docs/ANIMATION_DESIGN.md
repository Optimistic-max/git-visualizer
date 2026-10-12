# Animation and Interaction Design

Status: draft v0, written Oct 12 2026.
Who: Emmanuel builds the graph and every animation. Samuel owns the design system (the actual colors, fonts, spacing) and the HTML parts (caption, trays, tooltips). The *meaning* of each color and shape below is fixed; Samuel picks the exact values.
Read with: `SYSTEM_DESIGN.md` (architecture) and `AGENTS.md` (rules).

Timings in this document are in milliseconds (ms). 1000 ms = 1 second.

---

## 0. The whole idea in 30 seconds

> **Dots are born. Labels travel. Copies fly.**

1. **A commit is a dot, and a dot never moves.** It is born in one spot and stays there forever, because commits in git can't be changed.
2. **Branch names, HEAD and `origin/main` are labels, and labels are what move.** In git they really are just sticky notes pointing at a commit. When a beginner sees *only the sticky notes move*, they learn the most important idea in git without being told.
3. **When something goes between GitHub and your computer, a copy flies.** Up = you send. Down = you receive. The original never leaves its place.

Four more decisions follow from that:

4. **Same commit = same column.** GitHub is a shelf on top and your computer is a shelf below, and they share one set of columns. A commit lives in one column on both shelves, so a push is literally a copy flying *straight up*, and a fetch is a copy flying *straight down*.
5. **Missing things are drawn as dashed.** A dashed ring on a commit means "the other side doesn't have this yet". A dashed empty circle on your shelf means "GitHub has a commit you don't have". One meaning for "dashed", everywhere.
6. **Everything is built from state, not scripts.** The graph gets "snapshot before" and "snapshot after" and works out what to animate. If you pause mid-animation, flying copies are between two spots.
7. **Every animation is a short list of named phases** (for example `spotlight`, `copies-fly`, `land`, `flags-move`). Each element looks at the current phase and decides where it should be. That one trick gives you slow-motion, step-through, reduced-motion and tests almost for free.

---

## 1. What I kept, changed and threw out

| Earlier idea | Verdict | Why |
|---|---|---|
| Glowing orbs | **Changed to crisp dots with ring states** | Glow is pretty but carries no meaning. Rings carry meaning (dashed = not on the other side, split = merge commit). A small glow is kept only for the "afterglow" after something changes. |
| Sliding labels | **Kept, and made the star** | Labels are the things that move in git. |
| HEAD as its own marker that hops | **Changed: HEAD is a pin docked on a branch label** | HEAD points at a *branch*, not at a commit. It moves with the label on commit, and only hops on checkout. |
| Generic "packets" | **Changed to copies of the real dots** | What flies should be the thing that is being copied. Beginners see "my commit went up", not "a ball went up". |
| One graph plus a separate GitHub panel | **Changed to two shelves with shared columns** | The shared columns make push and fetch obvious without any explanation. |
| One station per teammate | **Dropped for v1** | That is multiplayer. The bot teammate is just a commit that appears on the GitHub shelf. |
| Ghost orbs for rebase | **Kept for later** | See section 10. |
| Branch creation forks the line | **Removed** | Wrong git. Creation adds a label. The line only forks when a commit gets a *second child* (see 2.2). |

---

## 2. The visual language

### 2.1 The stage

```
┌─ GITHUB (pretend) ───────────────────────────────────────────────┐
│  ☁         │   ○────○────○────○                                   │
│  gutter    │                    ☁ main   (GitHub's main label)    │
├─ YOUR COMPUTER ──────────────────────────────────────────────────┤
│ Working   Staging │   ○────○────○────○────○                       │
│ [login.js ✎] [  ] │              main ▸ HEAD     ☁ origin/main    │
└───────────────────────────────────────────────────────────────────┘
  $ git commit -m "Add login"        [1×]  [↻ replay this step]
  You saved a snapshot called "Add login". ...
```

- **Top shelf = GitHub.** Faint violet tint. **Bottom shelf = Your computer.** Faint slate tint.
- **Left gutter (fixed, never scrolls):** on the GitHub shelf, a cloud icon and the name. On your shelf, two small trays: **Working folder** and **Staging**.
- **History area (right, scrolls sideways like a camera):** the dots and lines. When a new column would fall off the right edge, the whole scene glides left (settle spring, ~600 ms). The camera only moves *between* events, never during one.
- **Caption bar (HTML, under the stage):** the command that was run, the plain-English caption, the speed control and "replay this step".

### 2.2 The grid: columns and lanes (this is what keeps dots from ever moving)

**Columns.** Every commit gets one column the first time it shows up in any event, counting left to right in the order they first appeared. (Inside one event, like clone, oldest commits get the left-most columns.) The column is the same on both shelves and never changes. Position: `x = column × 84`.

**Lanes.** Rows inside a shelf. Rule: **the first child of a commit stays on its parent's lane. A second child (a real fork) goes to a new lane.** Position: `y = lane × 64`.

This one rule is git-accurate in a way that matters:

- `git branch feature` adds a label and draws **nothing new**.
- Committing on `feature` while `main` hasn't moved just extends the line. Two labels sit at different points on the *same* line. There is still no fork, because it truly isn't one.
- The fork appears **only when a commit gets a second child**, meaning both sides have new work. That is exactly when git needs a merge, so the picture and the lesson show up together.

A merge commit takes the lane of its *first* parent (the branch you were on), and its second line curves in from the other lane. Lanes are never reused in v1. If a shelf needs more than three lanes, it grows taller with a settle spring.

Lane tracks (very faint horizontal guide lines) fade in the first time a lane is used. Never earlier.

### 2.3 Colors (meaning is fixed, values are Samuel's call)

| Thing | Meaning | Suggested look (dark stage) |
|---|---|---|
| **Gold** | **HEAD only.** Gold is never used for anything else. | `#FFC857` |
| **Violet** | **GitHub.** The shelf tint, the cloud icon, `origin/main`, copies traveling to or from GitHub (a short violet tail). | `#8B5CF6` |
| **Slate** | Your computer. Shelf tint and trays. | `#1B2230` shelf on `#0E1117` stage |
| **One hue per branch** | A dot is colored by the branch it was *created on*. Its flag and lane track use the same hue. `main` = sky blue, then pink, mint, orange. | `#5B9DFF`, `#FF6FB5`, `#3DDBB0`, `#FF9F4A` |
| **Split ring** | A merge commit: a bigger dot whose ring is split into its two parents' hues. | |
| **Green** | A success moment (accepted push). Brief, never permanent. | `#34D399` |
| **Coral** | A refusal (rejected push). Brief, never permanent. | `#FF5D5D` |
| **Dimmed (55%)** | Not part of the history of the branch HEAD is on. | |

**Variable names (the agreed list).** Samuel defines these once as CSS variables in his design file. The graph reads them by name and never uses a hard-coded color. Changing a value changes the whole graph. Adding or renaming a name needs both of you to agree.

| Variable | Used for |
|---|---|
| `--color-stage` | Background behind everything |
| `--color-shelf-computer` | Tint of the "Your computer" shelf |
| `--color-shelf-github` | Tint of the GitHub shelf |
| `--color-head` | The HEAD pin (nothing else) |
| `--color-github` | GitHub: cloud icons, `origin/main`, the tail on copies going to or from GitHub |
| `--color-branch-1` to `--color-branch-4` | One hue per branch (`main` is `--color-branch-1`) |
| `--color-success` | Accepted push, briefly |
| `--color-refuse` | Rejected push, briefly |
| `--color-focus-ring` | Keyboard focus ring |
| `--color-text` | Flag text and captions on the stage |

Fonts (`--font-mono`, `--font-ui`) and spacing work the same way. Sizes that the layout math needs (column width 84, lane height 64) are named constants in `packages/graph`, so ask Emmanuel if you want them changed.

Samuel: please run the final values through a contrast checker (WebAIM or similar). Aim for at least 3:1 for shapes and 4.5:1 for text. Also look at the stage with Chrome DevTools' color-blindness emulation (Rendering tab).

### 2.4 Shapes and icons (so color is never the only clue)

| Thing | Not just color, also... |
|---|---|
| HEAD | A pin icon and the word `HEAD`, docked on the left edge of a flag |
| GitHub things | A cloud icon on every GitHub or `origin/` flag |
| "Other side doesn't have it" | Dashed outline (ring or empty circle) |
| Merge commit | Bigger dot (radius 11 instead of 9) |
| Rejection | An ✕ icon and a shake, not just red |
| Success | A ✓ badge, not just green |
| File states in the trays | Modified = dotted outline plus ✎. Staged = solid outline plus ✓. |

### 2.5 The pieces

- **Dot** (radius 9, merge commit 11): filled with its branch hue. Hover or focus shows a card: message, short hash, parents, which labels point here, and which shelves have it.
- **Line (edge):** a thin line from parent to child, hue of the child's branch. Straight within a lane, a gentle S-curve between lanes. Because dots never move, **edges never need to move either**. They only get *drawn in* once (`pathLength` 0 to 1), which makes them very cheap to animate.
- **Flag (label):** a small rounded tag (height 22, monospace 12px). It hangs on a short pole above its commit on lane 0, and below its commit on lanes 1 and up (so flags never cover other lanes). Several flags on one commit stack in this order, closest to the dot first: the HEAD branch, other local branches (alphabetical), then GitHub ones. Show at most 3, then a "+2" chip.
  - **Branch flag:** solid, branch hue.
  - **`origin/main` flag:** violet outline plus a cloud. It's "your computer's bookmark of where GitHub is".
  - **GitHub's own `main` flag** (on the top shelf): solid violet plus a cloud.
- **HEAD pin:** gold pin docked on the left of one branch flag. That flag grows a little wider to hold it. Under the hood the pin is its own element with the same spring and the same target as its flag, so on commit the two move as one.
- **Trays (HTML or SVG, Samuel's look):** Working folder and Staging hold little file chips (`login.js`). A chip shows its state with an icon and an outline style.
- **A "✎ Edit a file" button on the Working folder tray** lets the learner make a file *modified*. Without it there would be nothing to `git add`. (This is a button, not a git command.)

### 2.6 Quiet helpers (small, cheap, a lot of teaching)

1. **Reachability glow.** Dots and lines that are part of the history of the branch HEAD is on stay at full strength. The rest sit at 55%. It teaches "a branch is everything you can reach going backward from its label". It also makes the fast-forward obvious (after it, all of `feature`'s commits light up as part of `main`). Cost: a short loop over parents.
   - Flags and text are *never* dimmed below readable.
2. **Ahead / behind chips.** Where `main` and `origin/main` differ, a small chip sits between their flags: `↑2 ahead`, `↓1 behind` or `↑1 ahead · ↓1 behind`. Before a fetch, your computer can't know about new GitHub commits, so the top shelf shows a violet note instead: `GitHub has 1 new commit`.
3. **Afterglow.** Everything that changed in the last event gets a soft outline ring that fades over 1200 ms. When several things change at once, this is how the eye finds them all. It does **not** block the next command.
4. **Hover a flag** to light up its history (the same glow as 1, but for any branch).
5. **Dashed missing slot.** When GitHub has a commit you don't, your shelf shows a dashed empty circle in that commit's column. It is the "missing piece" that fetch later fills.

### 2.7 How the eye is guided (rules for every animation)

1. **Cause, then travel, then effect, then labels, then glow.** Always in that order. Labels always move *after* the dots have settled, because labels are the consequence.
2. **Direction vocabulary:** left to right = time. Vertical = between places (up = send, down = receive). Diagonal-down = a fork.
3. **Rule of three:** at any moment, at most three things move: the *sender*, the *traveler*, the *receiver or label*. Everything else is still.
4. **Spotlight:** at the start of an event, uninvolved dots and lines drop to 50% of their usual opacity (this *multiplies* with the reachability glow) for the length of the hero motion, then return.
5. **Stagger, don't batch.** Several copies leave 120–150 ms apart, oldest first. Never all at once.
6. **Caption timing:** the caption fades in when the *effect* lands, not at the start. Reading lags motion by no more than ~300 ms. The caption never moves sideways while it is being read (fade, and at most a 6px rise).
7. **Camera is still during the hero motion.** It only pans between events.
8. **Budget:** everyday commands take 2 seconds or less. Clone may take up to 3. Afterglow doesn't count.

### 2.8 Motion vocabulary (the only moves we use)

| Name | What it looks like | Built with |
|---|---|---|
| **swoop** | A copy travels from A to B along a slight arc, starting and ending gently | tween, 450–600 ms, ease `[0.45, 0, 0.2, 1]` |
| **glide** | A label slides to a new commit, one tiny overshoot | spring, stiffness 170, damping 24 |
| **pop** | Something is born: grows from nothing with a small overshoot | spring, stiffness 380, damping 26 |
| **settle** | Small corrections (camera, stack re-ordering): no overshoot | spring, stiffness 260, damping 32 |
| **draw** | A line draws itself from parent to child | tween, 250–300 ms, ease `[0.16, 1, 0.3, 1]` |
| **pulse** | Scale 1 → 1.25 → 1 | settle spring, ~300 ms |
| **shake** | Three small side-to-side wiggles (±6px), rejection only | tween, 250 ms |
| **fade** | Opacity only | tween, 150–250 ms |

Plain-language note on the two kinds of motion: a **spring** has no fixed duration, it overshoots a bit and settles, like a real object. A **tween** has a fixed duration and an easing curve. We use tweens for *traveling* (A to B in a known time) and springs for *landing and settling*. That mix is what makes it feel physical instead of mechanical.

---

## 3. Command by command

Each command has: what the user sees (beat by beat), what it teaches, the caption, how it's built, and the screen-reader text. Reduced motion is covered once, in 4.6.

The order here is the order a learner would meet them.

### 3.1 `git clone`

**You see** (about 2.9 s)

| Time | What happens | Feel |
|---|---|---|
| 0–300 | Spotlight on the GitHub shelf. Your shelf shows a dashed empty outline: "No project yet". | fade |
| 300–1500 | For each commit, oldest first (150 ms apart): a copy lifts off its GitHub dot, flies straight **down** to the same column on your shelf, lands, and its line draws in. | swoop 450, pop, draw |
| 1500–1900 | The files from the newest snapshot slide into your Working folder tray (80 ms apart). | glide |
| 1900–2500 | Flags appear one by one (120 ms apart): `main` pops onto the newest dot, the HEAD pin drops from above onto `main`, then `origin/main` pops beside it. | pop, swoop 300, settle |
| 2500+ | Afterglow. | |

**Teaches:** Clone copies the *whole history*, not just the latest files, and you start with `main` and `origin/main` in the same place.

**Caption:** "You copied the whole project from GitHub, every commit and not just the latest files. `main` and `origin/main` start on the same commit."

**Built:** `clone` event. Dots whose ids are in `snapshotAfter.local` but not before get `born=false` until phase `copies-fly` has been reached, one by one. Flight layer draws copies from GitHub dot position to your shelf position. Flags appear when phase `flags-pop` is reached.

**Screen reader:** "Cloned the repository. 4 commits copied. main and origin/main both point to 'Add homepage'. HEAD is on main."

### 3.2 `git add`

**You see** (about 1 s)

| Time | What happens | Feel |
|---|---|---|
| 0–150 | The modified file chip in the Working folder lifts slightly (scale 1.05, soft shadow). | settle |
| 150–650 | A **copy** of the chip flies along a gentle arc to the Staging tray. The original stays put. | swoop 500 |
| 650–900 | The copy lands (small pop) and the Staging tray border brightens. At the same time the original's badge changes from `✎ modified` to `✓ staged` (cross-fade). | pop, fade 200 |
| 900+ | Afterglow. | |

**Teaches:** Staging is a box where you choose what goes into the next snapshot. It holds a copy of the file *as it is right now*, and your file stays in the working folder.

**Caption:** "You put `login.js` in the staging box. Staging holds a copy of the file as it is right now, and nothing is saved to history yet. If you change the file again, add it again."

**Why a copy flies and nothing "moves":** a move would suggest the file left your folder, which is false.

**Built:** `add` event (see section 9 for the contract change). The chip with the same `path` exists in both trays after the event, keyed by `path`.

**Screen reader:** "Staged login.js. The staging area now has 1 file. Nothing has been committed yet."

### 3.3 `git commit`

**You see** (about 1.5 s)

| Time | What happens | Feel |
|---|---|---|
| 0–200 | Spotlight. The staged chips pulse. | fade, pulse |
| 200–650 | The chips shrink into one small seed and fly from the Staging tray to the spot where the new dot will be born (next column, parent's lane or a fork lane). | swoop 450 |
| 650–1000 | The dot is born. Its line draws in from its parent. The Staging tray is empty and the working chips show clean. If this commit is a second child, the line curves down to the new lane here (the fork). | pop, draw 250 |
| 1000–1500 | The branch flag **with the HEAD pin on it** glides from the old dot to the new dot. `origin/main` stays behind, so an `↑1 ahead` chip fades in between. | glide |
| 1500+ | Afterglow. The dot has a dashed ring, because GitHub doesn't have it. | |

**Teaches:** A commit is a permanent snapshot. The branch label moves forward and HEAD rides along. GitHub doesn't know yet.

**Caption:** "You saved a snapshot called \"Add login\". `main` moved forward to it, and HEAD came along. GitHub doesn't know about it yet."
Caption variant when this creates a fork: "Both `main` and GitHub's `main` have new work now, so the history splits here."

**Built:** `commit` event. New dot id is in `snapshotAfter` but not before. The branch flag's target moves from the old commit's position to the new one at phase `flag-moves`. The HEAD pin reads the same target as the flag, so it goes with it.

**Screen reader:** "Created commit 'Add login' (c3d4e5f) on main. main now points to c3d4e5f and HEAD is on main. origin/main is still at b2c3d4e, so you are 1 commit ahead of GitHub."

### 3.4 `git branch`

**You see** (about 0.8 s)

| Time | What happens | Feel |
|---|---|---|
| 0–150 | Spotlight on the current dot. | fade |
| 150–600 | A thin pole draws out of the dot, and a new flag unfurls from it and joins the stack. | draw 150, pop |
| 600–800 | A dotted line from the new flag to the dot highlights ("points here") and fades. **Nothing else moves, and HEAD stays where it was.** | fade |

**Teaches:** A branch is just a label on a commit. Nothing was copied and nothing split.

**Caption:** "You made a new label called `feature` on this commit. Nothing was copied, and the line hasn't split. HEAD is still on `main`."

**Built:** `branch-create` event. New flag name appears in `snapshotAfter.local.branches`. No dot or edge changes. This is the hardest animation to get *right* because there is so little to animate: resist the urge to add a fork.

**Screen reader:** "Created branch feature at commit 'Add login'. HEAD is still on main."

### 3.5 `git checkout` / `git switch`

**You see** (about 0.95 s)

| Time | What happens | Feel |
|---|---|---|
| 0–150 | The HEAD pin lifts off its flag (scale 1.2, shadow). The flag it left shrinks back. | settle |
| 150–650 | The pin arcs (peaking ~30px above) to the other flag and lands. That flag widens to hold it. | swoop 500 + settle |
| 400–900 | The reachability glow sweeps: commits reachable from the new HEAD brighten, others dim to 55%, 40 ms apart, right to left. | fade, stagger |
| 650–950 | If the branches have different files, the Working folder chips cross-fade to match. | fade 250 |

**Teaches:** HEAD says which branch you're on. Switching moves HEAD and changes your files. History doesn't change.

**Caption:** "You switched to `feature`. HEAD, the 'you are here' pin, now points at `feature`, and your files match this branch. The history didn't change."

**Built:** `checkout` event. `snapshotAfter.local.head` differs from before. The pin's target changes from one flag to the other, so its spring makes the trip. The glow comes from the reachable set of the new HEAD branch.

`git switch -c feature` is two events sharing one `group` (see section 9): `branch-create`, a 200 ms breath, then `checkout`. The stepper chip shows ① Make the label, ② Move HEAD to it.

**Screen reader:** "HEAD moved from main to feature. 3 commits are in feature's history. No commits changed."

### 3.6 `git merge`, fast-forward

**Setup:** `main` is directly behind `feature` on the same line. Nothing new has happened on `main`.

**You see** (about 1.3 s)

| Time | What happens | Feel |
|---|---|---|
| 0–250 | Spotlight. The stretch of line from `main`'s dot to `feature`'s dot lights up, sweeping left to right. | draw 250 |
| 250–850 | The `main` flag (HEAD pin riding on it) glides along the lit line to `feature`'s dot. **No new dot is born.** | glide |
| 850–1300 | A chip near the dot fades in: "⏩ Fast-forward, no new commit". The two flags now stack on one dot. | fade |

**Teaches:** Fast-forward means `main` just catches up. No new commit is made.

**Caption:** "`main` had no new work, so git just slid the `main` label forward to `feature`'s latest commit. No new commit was created."

**Built:** `merge` event with `fastForward: true`. Only a flag target changes. The "no new dot" fact is *visible* because the dot count doesn't change.

**Screen reader:** "Fast-forward merge of feature into main. main now points to 'Style button'. No new commit was created."

### 3.7 `git merge`, merge commit

**Setup:** both branches have new commits since they split (a fork is on screen).

**You see** (about 1.8 s)

| Time | What happens | Feel |
|---|---|---|
| 0–300 | Spotlight. A small diamond pops on the **common ancestor**, and the stretch of each side since then is tinted in its branch hue. | pop |
| 300–900 | Two light pulses leave the two branch tips and fly along curved paths to the spot where the new dot will be born (next column, `main`'s lane). | swoop 600 |
| 900–1250 | **The merge dot ignites** where they meet: bigger, with a split ring in both hues. Two lines (one from each parent) draw in at once. | pop, draw 300 |
| 1250–1800 | The `main` flag (with HEAD) glides to the merge dot. **The `feature` flag stays where it was.** The diamond fades. | glide, fade 600 |

**Teaches:** A merge commit has two parents and joins two lines. Only the branch you were on moves, and `feature` is untouched.

**Caption:** "Both branches had new work, so git made a new commit with two parents to join them. `main` moved to it. `feature` stayed where it was."

**Built:** `merge` event with `fastForward: false` and `newCommitId`. The common ancestor is found by walking back from both tips (a plain loop over parents). The two pulses are tweened circles in the flight layer.

**Screen reader:** "Merged feature into main. Created merge commit a7b8c9d with two parents: 'Fix typo' and 'Update footer'. main now points to the merge commit. feature did not move."

**Merge preview (before pressing Enter):** about 150 ms after the learner finishes typing the branch name, a dashed ghost appears. For a fast-forward: a dashed arrow from the `main` flag to the destination, with the tag "⏩ will slide, no new commit". For a merge commit: a dashed ghost dot in the future spot, two dashed lines to its parents, and the tag "⑂ will create a merge commit". It disappears on edit or Enter. This makes "sometimes I get a merge commit and sometimes I don't" finally make sense.

### 3.8 `git push`, accepted

**Setup:** `main` is ahead of `origin/main`. The newer dots have dashed rings (GitHub doesn't have them).

**You see** (about 1.6 s)

| Time | What happens | Feel |
|---|---|---|
| 0–200 | Spotlight on the unpushed dots (dashed rings brighten). | fade |
| 200–850 | For each unpushed commit, oldest first (120 ms apart): a copy lifts off, and flies **straight up** to its own column on the GitHub shelf, with a short violet tail. | swoop 450 |
| 850–1150 | Copies land and become real GitHub dots (pop), lines draw in, the shelf gives a soft violet pulse and a ✓ badge. Back on your shelf, the dashed rings dissolve to solid, staggered. | pop, pulse, fade 200 |
| 1150–1600 | Two flags glide **at the same moment**: GitHub's `main` (top shelf) and your `origin/main` (your shelf), both to the newest pushed commit. The `↑ ahead` chip fades out. | glide |
| 1600+ | Afterglow. | |

**Teaches:** Push *copies* commits up and moves GitHub's branch. `origin/main` moves too, but only because GitHub said yes.

**Caption:** "You sent copies of your new commits to GitHub, and GitHub accepted them. Its `main` moved up, and so did your `origin/main` bookmark."

**Built:** `push` event with `accepted: true`. Copies are drawn in the flight layer from your dot's position to the same column on the GitHub shelf. Dots on the top shelf are born when phase `land` is reached. Both flag moves are triggered by one phase, `flags-move`.

**Screen reader:** "Pushed 2 commits to GitHub. GitHub accepted them. GitHub's main and origin/main now point to 'Style button'. Your computer is up to date with GitHub."

### 3.9 `git push`, rejected (the bounce-back)

**Setup:** GitHub has a commit you don't have (a teammate pushed). Your shelf already shows the dashed empty circle in that commit's column, with the note `GitHub has 1 new commit`. GitHub's `main` and your `main` point at different dots.

**You see** (about 1.7 s)

| Time | What happens | Feel |
|---|---|---|
| 0–200 | Spotlight on your unpushed commit, GitHub's tip, and the dashed empty circle. | fade |
| 200–700 | A copy of your commit flies up toward the GitHub shelf. | swoop 500 |
| 700–950 | It hits a thin violet-coral **gate** along the shelf's lower edge and **stops short**. It shakes (±6px, three wiggles), flashes coral, and shows an ✕. | shake 250 |
| 950–1500 | The copy flies back down and settles on its dot. The dashed ring stays. | glide |
| 1000–1700 | GitHub's extra commit pulses twice. The dashed circle on your shelf pulses too. A small callout between them: "GitHub has this. You don't." | pulse |
| 1700+ | In the terminal, a hint chip: `Try: git pull`. | |

**Teaches:** GitHub refuses a push if it has work you don't have, because pushing would overwrite it. Bring that work down first, then push again.

**Caption:** "GitHub said no. It has a commit you don't have yet (the dashed circle), and pushing now would erase it. Pull first, then push again."

**Built:** `push` event with `accepted: false`. Nothing in `snapshotAfter` changes. The animation is *all* choreography. That is fine, because the lesson is "nothing changed".

**Screen reader:** "Push rejected. GitHub's main has a commit your computer doesn't have. Nothing was sent. Run git pull, then push again."

### 3.10 `git pull` (two steps: fetch, then merge)

A short step indicator sits above the caption the whole time: **① Fetch (download) → ② Merge (combine)**. It lights up as each step plays. This is what makes "pull = fetch + merge" something beginners actually *see*.

**Step ① Fetch** (about 1.55 s)

| Time | What happens | Feel |
|---|---|---|
| 0–250 | Spotlight on the dashed circle and GitHub's extra commit. ① lights up. | fade |
| 250–900 | A copy of GitHub's commit flies straight **down** into the dashed circle. The circle fills with color and its dashed ring turns solid. Its line draws in. | swoop 450, pop, draw |
| 900–1350 | Your `origin/main` flag glides to the new dot. **`main` and HEAD stay exactly where they were.** | glide |
| 1350–1550 | A chip fades in between `main` and `origin/main`: `↑1 ahead · ↓1 behind` (if you had commits of your own). | fade |

**Teaches:** Fetch only updates your copy of GitHub (`origin/main`). Your own branch isn't touched.

**Caption:** "Step 1 of 2: your computer downloaded GitHub's new commit. Only `origin/main` moved. Your own `main` hasn't changed yet."

**Screen reader:** "Fetched 1 new commit from GitHub. origin/main now points to 'Update footer'. Your main did not change."

**Breath (600 ms):** the indicator changes from ① to ②. Nothing else moves. This pause is on purpose, so the two steps feel like two steps.

**Step ② Merge:** plays exactly like 3.6 (if `main` is simply behind: fast-forward) or 3.7 (if both have new work: merge commit), with `origin/main` as the branch being merged in.

**Caption for ②:** "Step 2 of 2: now git merged `origin/main` into your `main`." (then the fast-forward or merge-commit caption from above)

**Built:** two events, `fetch` then `merge`, sharing a `group` (see section 9). The director plays them back to back and shows the indicator because they share the group.

---

## 4. Interaction design

### 4.1 Terminal and graph talk to each other
- **Preview before Enter** for `merge` (3.7). Push is *not* previewed by default, so the learner can discover the rejection themselves. A "Hints" toggle can add a preview later.
- **Next-step hint chip** after an event: after a rejected push, `Try: git pull`. Samuel's lessons can set these too.
- **Unknown commands** get a friendly message, never an error.

### 4.2 Playback controls (cheap, high value)
- **Speed:** 0.5×, 1×, 2×. Every duration is divided by the speed. This one number also gives you slow-motion for debugging.
- **Step-through mode:** instead of waiting a set time between phases, wait for Space or Enter. Great for teachers, and for you when tuning.
- **↻ Replay this step:** play the last event again from the same before and after snapshots. We already have both, so this costs almost nothing, and learners *will* use it.

### 4.3 If the learner types fast
Events go into a queue. The current event finishes at 4× speed, then the next one plays at normal speed. The graph is never behind the truth for more than a moment, and nothing overlaps.

### 4.4 Keyboard-only graph
- **Tab** puts focus on the graph as one stop (it doesn't trap you). After it come the speed and replay controls.
- Inside the graph:
  - **Left** = go to the commit's (first) parent. **Right** = go to a child (press again to cycle children at a fork).
  - **Up / Down** = jump to the *same commit on the other shelf*. Up = GitHub, Down = your computer. If it isn't there, the announcement says so ("This commit is not on GitHub yet"), which is a lesson in itself.
  - **L** cycles through the labels (flags). **Enter** reads which commit the label points at.
- Focus ring: a 3px white-blue ring with a 2px gap. Don't use gold (HEAD) for it.
- Focused commit shows the same card as hover.

### 4.5 Screen readers
- Every event has two texts: the short **caption** for everyone, and a longer **screen-reader sentence** with exact state (see each command above). The caption sits in an `aria-live="polite"` region.
- The screen-reader sentence is made by one pure function, `describeChange(before, after)`. A pure function is easy to test, and it can't drift from what the graph shows, because both use the same snapshots.

### 4.6 Reduced motion (the calm version)
When the user's system asks for reduced motion:

| Normally | Instead |
|---|---|
| swoop, glide, settle | The thing appears in its final place at once, with a **static highlight ring** that stays for 2 s |
| pop | A 150 ms fade in |
| draw | A 150 ms fade in |
| shake | A static coral outline and the ✕ icon |
| spotlight, stagger, camera pan | Skipped (camera jumps) |
| reachability glow | Still applied (it is just opacity) |

The caption, the step indicator and the screen-reader text are **exactly the same**. Nothing about the lesson is lost, only the travel.

How: the director sets every phase time to 0 except `afterglow`, and every `transition` uses `duration: 0` for positions. Wrapping the app in Motion's `<MotionConfig reducedMotion="user">` is a good safety net, but as far as I know it only switches off *transform* animations, not SVG attributes like `cx` and `cy`. So the director has to handle it itself. Write a Playwright test for this (`page.emulateMedia({ reducedMotion: "reduce" })`) to be sure.

---

## 5. The "wow" moments (the ones people screen-record)

1. **The Rescue (rejected push, then pull, then push).** About 14 seconds that tells one story. Your push bounces off the gate with a shake. A dashed circle is sitting there, empty. `git pull`, and GitHub's missing commit flies down and fills the circle. Then two lines race together and a merge dot ignites with a split ring. Push again, and a row of copies flies up and lands with a green ✓. This is the single most confusing thing for beginners in all of git, and the animation explains it with no words.
2. **Merge ignition, with preview.** Type `git merge feature` and a dashed ghost of the result appears *before* you press Enter. Press Enter and two pulses race along the branches and meet to ignite the merge dot. Put a fast-forward next to it and the difference is obvious.
3. **Clone rain.** An empty shelf fills with the project's whole history, left to right, with each line unspooling behind its dot. Then the flags pop in and HEAD drops onto `main`. About 3 seconds, loops well as a GIF, and is a good landing page hero.

Bonus: the **checkout glow sweep** (history lights up behind HEAD as the pin arcs over).

---

## 6. What to avoid

**Mistakes that make a learning tool feel like a slideshow**
- **Animating each command as a separate canned clip.** Always animate the *difference between two states*.
- **Re-laying out the whole graph on every command.** Dots jump, and the learner loses their place. Dots are born in a fixed spot and never move.
- **Everything moving at once.** Use the rule of three and the stagger.
- **Playing the animation before the learner has seen the "before".** Keep the before-state on screen until the spotlight starts.
- **Long animations.** Stay under the time budget in 2.7. Offer speed and replay instead of making it longer.
- **Bouncy overshoot on everything.** Use pop for births, glide for labels, settle for everything else.
- **Idle animations** (breathing glows, floating dots). They compete with the lesson.
- **Confetti or cute effects.** A soft pulse and a ✓ are enough, and confetti reads as childish to a CS student.
- **Spinning, scaling text, or text that slides while being read.**

**Mistakes that confuse beginners (teach wrong git)**
- Showing a **fork when a branch is created**. Creation adds a flag.
- **HEAD hopping dot to dot.** HEAD sits on a branch flag.
- **Moving commits.** Only labels move. (Rebase, later, makes *new* dots.)
- A **file "moving"** on `git add`, or a **commit "moving"** on push. Those are copies.
- Moving `origin/main` on **commit**, or the local `main` on **fetch**.
- Showing **fast-forward and merge commit the same way.** They must look clearly different (no new dot vs. a new split-ring dot).
- **Using color alone** to mean something.
- **Using one color for two meanings** (gold = HEAD only, coral = refusal only).
- **Stacking too many flags** into an unreadable pile.

**Build mistakes**
- **Using `setTimeout` chains** for timing. They drift and can't be paused. Use the phase list.
- **Not cancelling or queueing** when the learner types fast.
- **Animating `layoutId` on SVG.** It doesn't work well there. Animate `cx` and `cy` (or `x` and `y` on a `<g>`) directly, and keep `layoutId` for HTML parts like the caption and tray chips.
- **Animating the path `d` of an edge between different shapes.** Because dots never move, edges only need to be drawn in with `pathLength`.

---

## 7. How it's built

### 7.1 The flow

```
 Enter in terminal
      │
      ▼
 engine returns an event (with snapshotAfter)
      │
      ▼
 queue: (snapshotBefore, event)
      │
      ▼
 Director: picks the phase list for event.type, steps through it
      │          sets "current phase" for everything below
      ▼
 Stage components: each reads (snapshotBefore, snapshotAfter, phase)
      Dot, Edge, Flag, HeadPin, FlightCopy, Tray, Chip ...
      each decides: "old spot or new spot? visible yet?"
```

**The event type picks the choreography. The snapshot difference decides what exactly gets drawn.** Never trust the event type alone: `diffSnapshots(before, after)` is the source of truth for what changed.

### 7.2 Folder plan for `packages/graph`

```
packages/graph/src/
  motion/tokens.ts            the springs, easings, durations, speed helper
  layout/assignColumns.ts     commit id -> column (from the event log)
  layout/assignLanes.ts       commit id -> lane (the "second child forks" rule)
  layout/positions.ts         column + lane -> x, y, for both shelves
  logic/diffSnapshots.ts      what changed between before and after
  logic/reachable.ts          which commits can you reach from a label
  logic/aheadBehind.ts        the numbers for the chips
  logic/describeChange.ts     the screen-reader sentence
  director/phases.ts          the phase list for each event type
  director/Director.ts        the queue and the stepping
  components/Stage.tsx        shelves, camera, layers
  components/Dot.tsx  Edge.tsx  Flag.tsx  HeadPin.tsx  FlightCopy.tsx
  components/Chip.tsx         ahead/behind, fast-forward tag, hints
```

Everything in `logic/` and `layout/` is a plain function with no React and no Motion, so Vitest can test it easily.

### 7.3 Small code sketches (kept simple on purpose)

**The feel of the whole app lives in one file.** Change a number and every animation changes.

```ts
// motion/tokens.ts
// All the "feel" of the app lives here.

// Springs are for things that LAND or SETTLE (they overshoot a little, like real objects).
export const SPRING = {
  // glide: flags and the HEAD pin. Gentle, one tiny overshoot.
  glide: { type: "spring", stiffness: 170, damping: 24 },
  // pop: a new dot or flag being born. Quick, small overshoot.
  pop: { type: "spring", stiffness: 380, damping: 26 },
  // settle: small corrections like the camera. No overshoot.
  settle: { type: "spring", stiffness: 260, damping: 32 },
} as const;

// Easing curves are for things that TRAVEL from A to B in a fixed time.
export const EASE = {
  travel: [0.45, 0, 0.2, 1], // starts gently, ends gently
  enter: [0.16, 1, 0.3, 1],  // starts fast, slows down (good for drawing lines)
} as const;

// Turns milliseconds into the seconds Motion wants.
// speed 2 means twice as fast. Reduced motion means no travel time at all.
export function sec(ms: number, speed: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  return ms / 1000 / speed;
}
```

**The lane rule.** The most unusual rule in the layout, so it gets a sketch:

```ts
// layout/assignLanes.ts
// Rule: the FIRST child of a commit stays on its parent's lane.
// A SECOND child is a real fork, so it gets a new lane.
// Dots never move once placed.

export function assignLanes(events: GitEvent[]): Record<string, number> {
  const lane: Record<string, number> = {};        // commit id -> lane number (0 = top lane)
  const childCount: Record<string, number> = {};  // how many children each commit has so far

  for (const event of events) {
    // Every commit in this event's snapshots, OLDEST FIRST (so a parent is always placed before its child).
    const commits = commitsOldestFirst(event.snapshotAfter);

    for (const commit of commits) {
      if (lane[commit.id] !== undefined) continue;   // already placed, never move it

      const parentId = commit.parents[0];            // the first parent only
      if (parentId === undefined) {                  // the very first commit
        lane[commit.id] = 0;
        continue;
      }

      const kids = childCount[parentId] ?? 0;        // how many children did the parent already have?
      childCount[parentId] = kids + 1;

      if (kids === 0) {
        lane[commit.id] = lane[parentId];            // first child: stay on the parent's lane
      } else {
        lane[commit.id] = biggestLane(lane) + 1;     // second child: a fork, new lane
      }
    }
  }
  return lane;
}
```

Check it against the fake stream: `c4` (on `feature`) is the first child of `c3`, so it stays on lane 0 (no fork, because `main` hasn't moved). `c5` (the bot's) is the first child of `c4`, lane 0. `c6` (yours) is the *second* child of `c4`, so it forks to lane 1. The merge commit `c7` takes `c6`'s lane (its first parent).

**A dot that is born when the director says so.** The dot gets its position as plain numbers and never moves. The only animation is being born.

```tsx
// components/Dot.tsx
import { motion } from "motion/react";
import { SPRING } from "../motion/tokens";

type DotProps = {
  x: number;          // where this dot lives (never changes)
  y: number;
  color: string;      // the branch hue it was born on
  born: boolean;      // false until the director reaches the "born" phase
  onGitHub: boolean;  // false = only on your computer, so show the dashed ring
  opacity: number;    // 1 normally, lower when dimmed
};

export function Dot({ x, y, color, born, onGitHub, opacity }: DotProps) {
  return (
    <g>
      {/* The dashed ring says "the other side doesn't have this yet".
          When the commit reaches GitHub, the ring fades out instead of popping away. */}
      <motion.circle
        cx={x} cy={y} r={14}
        fill="none" stroke={color} strokeDasharray="3 3"
        animate={{ opacity: onGitHub || !born ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      />
      {/* The dot itself: grows from nothing with a small overshoot. */}
      <motion.circle
        cx={x} cy={y} fill={color}
        initial={{ r: 0 }}
        animate={{ r: born ? 9 : 0, opacity }}
        transition={{ r: SPRING.pop, opacity: { duration: 0.2 } }}
      />
    </g>
  );
}
```

If animating `r` misbehaves in a browser, put the circle in a `<motion.g>` and animate `scale` with `style={{ transformBox: "fill-box", transformOrigin: "center" }}` instead.

**An animation is a list of named phases.** This is the heart of the design.

```ts
// director/phases.ts
// One animation = a list of named phases and how long each lasts (in ms).
export const pushAcceptedPhases = [
  { name: "spotlight",  ms: 200 },   // dim everything not involved
  { name: "copies-fly", ms: 650 },   // copies fly up to the GitHub shelf
  { name: "land",       ms: 300 },   // copies become real GitHub dots
  { name: "flags-move", ms: 450 },   // GitHub's main and origin/main glide
  { name: "afterglow",  ms: 1200 },  // changed things glow, then fade (does not block the next command)
];
```

```ts
// director/Director.ts (simplified)
// Plays one event: walks through its phases one at a time.
async function playEvent(event: GitEvent, controls: DirectorControls) {
  const phases = phasesFor(event);          // pick the phase list by event type

  for (const phase of phases) {
    controls.setPhase(phase.name);          // 1. tell every component which phase we're in
    await controls.wait(phase.ms);          // 2. wait: shorter at 2x, zero in reduced motion,
                                            //    or until Space is pressed in step-through mode
  }
  controls.setPhase("idle");                // 3. back to rest
}
```

```tsx
// How a component uses the phase (the idea, not the whole file).
// "reached" asks: has the animation got to this phase yet?
const { reached } = usePhase();

// The flag sits at its OLD spot until the "flags-move" phase, then glides to its NEW spot.
const target = reached("flags-move") ? newPosition : oldPosition;

return <motion.g animate={{ x: target.x, y: target.y }} transition={SPRING.glide} />;
```

That is the whole trick. Every element has an old spot, a new spot, and a phase that says when to switch. Slow-motion, step-through, reduced motion and "replay this step" are all just different ways of moving through the phase list.

### 7.4 Layers and the camera

Stack these inside one `<svg>`, bottom to top:

1. Shelf backgrounds and lane tracks.
2. **Camera group** (a `motion.g` that animates its `x`): edges, dots, flags, HEAD pin.
3. **Flight layer** (copies, pulses, comet tails): sits *above* the camera group and uses screen coordinates, because copies fly between the two shelves and into the gutter trays. A helper adds the camera offset to a dot's position to get its screen position.
4. Gutter (trays) and chips on top, fixed in place. A soft fade mask on the gutter's edge lets dots slide away under it.

### 7.5 Testing the animations

- **Vitest (pure logic):** `assignColumns`, `assignLanes`, `diffSnapshots`, `reachable`, `aheadBehind`, `describeChange`. Run them against the fake stream first.
- **Playwright (the pause test):** set speed to 0.02 so animations crawl, run `git push`, wait until the phase is `copies-fly`, read a copy's `cx` and `cy`, and check that they are **between** the start and end values. That is the "pause mid-animation and things are between positions" test, written down.
- **Playwright (reduced motion):** `page.emulateMedia({ reducedMotion: "reduce" })`, then check that final positions are reached with no in-between values.
- **Playwright (keyboard):** Tab to the graph, press arrows, check the live region text.
- Run Playwright in Chromium **and** WebKit.

### 7.6 Tuning checklist (run before every release)
- Watch every command at 0.25× and look for anything that overlaps or fights.
- Type three commands very fast. Nothing should overlap or get stuck.
- Reduced motion on. Is every lesson still clear?
- Keyboard only. Can you do the whole Rescue without a mouse?
- Color-blindness emulation on. Can you still tell everything apart?
- Show it to someone who doesn't know git. Don't explain. Ask what they think just happened.

---

## 8. Priority order (biggest impact first)

There is no strict timetable. The "Week" labels below are rough size guesses, not deadlines. The order is what matters.

| # | Build this | Why it comes here | Rough effort |
|---|---|---|---|
| 1 | Stage, grid, static render of any snapshot (dots, lines, flags, shelves, no animation) | Everything else sits on this. Test against the fake stream. | Week 1 |
| 2 | **Commit** (born dot, line draws, flag and HEAD glide) | The most-used command, and it proves the whole pipeline: diff, phases, springs. | Week 1 |
| 3 | Caption, speed control, replay this step, reachability glow | Almost free and they make every later animation better. | Week 1–2 |
| 4 | **Branch** and **checkout** (flag unfurl, HEAD arc) | The "labels, not copies" lesson. The highest teaching value per hour. | Week 2 |
| 5 | **Merge fast-forward** and **merge commit** with preview | The contrast people always ask about, and wow moment 2. | Week 2–3 |
| 6 | **Push accepted**, **push rejected**, **fetch**, **pull stepper** | The hardest-to-understand part of git, and wow moment 1. Needs the remote band, so build it against the fake stream while the engine catches up. | Week 3–4 |
| 7 | **Clone** | Wow moment 3 and a good landing page hero. Lower teaching value than the rest, so it can come later. | Week 4 |
| 8 | **Add** (staging) | Easy to build, but staging has little to show until the rest works. | Week 4 |
| 9 | Keyboard graph, screen-reader sentences, reduced-motion polish, afterglow polish | Designed in from day one, finished here. | Week 5 |

**If time runs short, cut in this order:** spotlight dimming, the merge preview, the clone files-into-folder step, the add animation. **Never cut:** commit, branch, checkout, both merges, push accepted, push rejected, fetch.

---

## 9. Contract changes this design needs

These changes are now in `packages/engine/src/events.ts` and `fakeStream.ts`. Emmanuel and Samuel should still agree on them before anyone builds on them.

1. **A new `add` event:** `{ type: "add"; paths: string[] }`.
2. **A new `edit` event** for the "✎ Edit a file" button: `{ type: "edit"; path: string }`. It isn't a git command, but it is part of the story, because there is nothing to add until a file is modified.
3. **Working folder and staging in the snapshot.** In `LocalState`: `workingFiles: { path: string; status: "clean" | "modified" }[]` and `staged: string[]`. A commit empties `staged` and sets files to clean.
4. **A `group` on every event:** `group?: { command: string; part: number; of: number }`. This is how the director knows `fetch` + `merge` are one `pull` (shows the ①/② indicator) and `branch-create` + `checkout` are one `switch -c`.
5. **The typed command on every event:** `command: string`, such as `"git push"`. It is shown in the caption bar and used in the screen-reader text.
6. **Not in the contract on purpose:** columns, lanes, positions and screen-reader sentences. The graph works those out from the snapshots, so the engine stays free of drawing and the format stays small.

`AGENTS.md` already lists `add` in the v1 commands.

---

## 10. Later ideas (v1.5 and beyond)

- **Rebase.** Old dots stay behind as faded ghosts, and a *new* dot (new id) flies out of each ghost to the new base, one at a time. This is where "never rewrite a shared branch" finally clicks. Uses the old-id to new-id map.
- **Merge conflict.** A collision: three columns (yours, original, theirs). The conflicting line from each side flies in and crashes in the middle, then the learner chooses keep yours, keep theirs or combine both. The merge dot ignites only after it is resolved.
- **Reset.** The branch flag slides *backward*. The commits it leaves behind dim but stay, labeled "still recoverable". Undo brings them back to full color.
- **Revert.** A new dot is born that undoes an old one. History only grows.
- **Diff panel and staging flight.** Lines of a file fly from the working folder to staging to a new dot. Added lines grow green, deleted lines collapse red, computed from a real diff.
- **Replay scrubber and share links.** A slider that drags through saved events. Stepping backward is just animating to the previous snapshot. A link replays exactly what happened.
- **Predict, then watch.** Before Enter, ask "what do you think will happen?" with a few choices, then play the animation. Making a guess first is one of the best-known ways to learn.
- **Multiplayer.** Extra teammates as extra marks on the GitHub shelf, with live copies flying up from each one.
