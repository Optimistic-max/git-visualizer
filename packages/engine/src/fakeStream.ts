// fakeStream.ts
// A hard-coded list of events, written by hand. It uses NO real git.
// Samuel builds the page, the trays and the GitHub panel against this
// until the real engine is ready. Emmanuel can also use it to build the
// graph animations before the engine exists.
//
// The story it tells (every commit is preceded by an edit and an add, like real git):
//    1. clone
//    2-4.  edit login.js, add it, commit "Add login" on main
//    5.    branch feature (just a label)
//    6.    checkout feature
//    7-9.  edit index.html, add it, commit "Style button" on feature
//   10.    checkout main
//   11.    merge feature into main (fast-forward, no new commit)
//   12.    push (accepted)
//   13.    the bot teammate pushes a commit to GitHub
//   14-16. edit login.js, add it, commit "Fix typo" on main
//   17.    push (rejected: GitHub has a commit you don't have)
//   18-19. pull = fetch, then merge (a new merge commit with two parents)
//   20.    push (accepted)

import { FORMAT_VERSION } from "./events";
import type { Commit, EventLog, GitEvent, Snapshot, WorkingFile } from "./events";

// ---------- The commits (the dots) ----------

const c1: Commit = { id: "a1b2c3d", parents: [], message: "Start project" };
const c2: Commit = { id: "b2c3d4e", parents: ["a1b2c3d"], message: "Add homepage" };
const c3: Commit = { id: "c3d4e5f", parents: ["b2c3d4e"], message: "Add login" };
const c4: Commit = { id: "d4e5f6a", parents: ["c3d4e5f"], message: "Style button" };
// c5 is made by the bot teammate on the pretend GitHub.
const c5: Commit = { id: "e5f6a7b", parents: ["d4e5f6a"], message: "Update footer (bot)" };
// c6 is made by you on main, while the bot was making c5.
const c6: Commit = { id: "f6a7b8c", parents: ["d4e5f6a"], message: "Fix typo" };
// c7 is the merge commit. It has TWO parents.
const c7: Commit = { id: "a7b8c9d", parents: ["f6a7b8c", "e5f6a7b"], message: "Merge origin/main" };

// ---------- The working folder (three possible states) ----------

// Nothing changed since the last commit.
const filesClean: WorkingFile[] = [
  { path: "index.html", status: "clean" },
  { path: "login.js", status: "clean" },
];
// login.js was edited.
const filesLoginModified: WorkingFile[] = [
  { path: "index.html", status: "clean" },
  { path: "login.js", status: "modified" },
];
// index.html was edited.
const filesIndexModified: WorkingFile[] = [
  { path: "index.html", status: "modified" },
  { path: "login.js", status: "clean" },
];

// ---------- The snapshots (the full picture after each event) ----------
// Each snapshot starts from the one before it (the "..." copies it)
// and then changes only what changed.

// 1. After clone: everything is on main, origin/main is on the same dot,
//    the working folder has the files and nothing is staged.
const snap1: Snapshot = {
  local: {
    commits: { [c1.id]: c1, [c2.id]: c2 },
    branches: { main: c2.id },
    head: "main",
    remoteBranches: { "origin/main": c2.id },
    workingFiles: filesClean,
    staged: [],
  },
  remote: {
    commits: { [c1.id]: c1, [c2.id]: c2 },
    branches: { main: c2.id },
  },
};

// 2. After editing login.js: it is now modified.
const snap2: Snapshot = {
  local: { ...snap1.local, workingFiles: filesLoginModified },
  remote: snap1.remote,
};

// 3. After git add login.js: it is in the staging box.
//    (It is still "modified" because it still differs from the last commit.)
const snap3: Snapshot = {
  local: { ...snap2.local, staged: ["login.js"] },
  remote: snap2.remote,
};

// 4. After commit "Add login": main slides forward to c3 (HEAD goes with it).
//    The staging box is empty again and the files are clean.
const snap4: Snapshot = {
  local: {
    ...snap3.local,
    commits: { ...snap3.local.commits, [c3.id]: c3 },
    branches: { main: c3.id },
    workingFiles: filesClean,
    staged: [],
  },
  remote: snap3.remote,
};

// 5. After "git branch feature": a new label on c3. No fork, HEAD stays on main.
const snap5: Snapshot = {
  local: { ...snap4.local, branches: { main: c3.id, feature: c3.id } },
  remote: snap4.remote,
};

// 6. After checkout feature: only HEAD changes.
const snap6: Snapshot = {
  local: { ...snap5.local, head: "feature" },
  remote: snap5.remote,
};

// 7. After editing index.html.
const snap7: Snapshot = {
  local: { ...snap6.local, workingFiles: filesIndexModified },
  remote: snap6.remote,
};

// 8. After git add index.html.
const snap8: Snapshot = {
  local: { ...snap7.local, staged: ["index.html"] },
  remote: snap7.remote,
};

// 9. After commit "Style button" on feature: feature slides to c4. main stays on c3.
//    There is still no fork: c4 is the only child of c3, so it is one straight line.
const snap9: Snapshot = {
  local: {
    ...snap8.local,
    commits: { ...snap8.local.commits, [c4.id]: c4 },
    branches: { main: c3.id, feature: c4.id },
    workingFiles: filesClean,
    staged: [],
  },
  remote: snap8.remote,
};

// 10. After checkout main: only HEAD changes.
const snap10: Snapshot = {
  local: { ...snap9.local, head: "main" },
  remote: snap9.remote,
};

// 11. After the fast-forward merge: no new dot. The main label slides to c4.
const snap11: Snapshot = {
  local: { ...snap10.local, branches: { main: c4.id, feature: c4.id } },
  remote: snap10.remote,
};

// 12. After push is accepted: the pretend GitHub gets c3 and c4,
//     and your copy of GitHub (origin/main) moves too.
const snap12: Snapshot = {
  local: { ...snap11.local, remoteBranches: { "origin/main": c4.id } },
  remote: {
    commits: { ...snap11.remote.commits, [c3.id]: c3, [c4.id]: c4 },
    branches: { main: c4.id },
  },
};

// 13. After the bot pushes c5 to the pretend GitHub. Your computer does not know yet.
const snap13: Snapshot = {
  local: snap12.local,
  remote: {
    commits: { ...snap12.remote.commits, [c5.id]: c5 },
    branches: { main: c5.id },
  },
};

// 14. After editing login.js again.
const snap14: Snapshot = {
  local: { ...snap13.local, workingFiles: filesLoginModified },
  remote: snap13.remote,
};

// 15. After git add login.js.
const snap15: Snapshot = {
  local: { ...snap14.local, staged: ["login.js"] },
  remote: snap14.remote,
};

// 16. After commit "Fix typo" on main. Now you and GitHub have both moved on from c4.
//     c6 is the SECOND child of c4 (c5 was the first), so this is where the line forks.
const snap16: Snapshot = {
  local: {
    ...snap15.local,
    commits: { ...snap15.local.commits, [c6.id]: c6 },
    branches: { main: c6.id, feature: c4.id },
    workingFiles: filesClean,
    staged: [],
  },
  remote: snap15.remote,
};

// 17. The rejected push changes nothing. It uses snap16 again.

// 18. After fetch: c5 comes down and only origin/main moves. Your main stays on c6.
const snap18: Snapshot = {
  local: {
    ...snap16.local,
    commits: { ...snap16.local.commits, [c5.id]: c5 },
    remoteBranches: { "origin/main": c5.id },
  },
  remote: snap16.remote,
};

// 19. After merging origin/main into main: a new merge commit c7 with two parents.
const snap19: Snapshot = {
  local: {
    ...snap18.local,
    commits: { ...snap18.local.commits, [c7.id]: c7 },
    branches: { main: c7.id, feature: c4.id },
  },
  remote: snap18.remote,
};

// 20. After the second push is accepted: GitHub gets c6 and c7.
const snap20: Snapshot = {
  local: { ...snap19.local, remoteBranches: { "origin/main": c7.id } },
  remote: {
    commits: { ...snap19.remote.commits, [c6.id]: c6, [c7.id]: c7 },
    branches: { main: c7.id },
  },
};

// ---------- The events (what happened, in order) ----------

export const fakeEvents: GitEvent[] = [
  {
    step: 1,
    type: "clone",
    command: "git clone https://github.com/demo/project.git",
    caption: "You copied the whole project from GitHub, every commit and not just the latest files. `main` and `origin/main` start on the same commit.",
    snapshotAfter: snap1,
  },
  {
    step: 2,
    type: "edit",
    path: "login.js",
    command: "edit login.js",
    caption: "You changed `login.js`. Git can tell it is different from the last commit, so it is marked as modified.",
    snapshotAfter: snap2,
  },
  {
    step: 3,
    type: "add",
    paths: ["login.js"],
    command: "git add login.js",
    caption: "You put `login.js` in the staging box. Staging holds a copy of the file as it is right now, and nothing is saved to history yet. If you change the file again, add it again.",
    snapshotAfter: snap3,
  },
  {
    step: 4,
    type: "commit",
    commitId: c3.id,
    branch: "main",
    command: "git commit -m \"Add login\"",
    caption: "You saved a snapshot called \"Add login\". `main` moved forward to it, and HEAD came along. GitHub doesn't know about it yet.",
    snapshotAfter: snap4,
  },
  {
    step: 5,
    type: "branch-create",
    name: "feature",
    atCommit: c3.id,
    command: "git branch feature",
    caption: "You made a new label called `feature` on this commit. Nothing was copied, and the line hasn't split. HEAD is still on `main`.",
    snapshotAfter: snap5,
  },
  {
    step: 6,
    type: "checkout",
    branch: "feature",
    command: "git checkout feature",
    caption: "You switched to `feature`. HEAD, the \"you are here\" pin, now points at `feature`, and your files match this branch. The history didn't change.",
    snapshotAfter: snap6,
  },
  {
    step: 7,
    type: "edit",
    path: "index.html",
    command: "edit index.html",
    caption: "You changed `index.html`. It is marked as modified.",
    snapshotAfter: snap7,
  },
  {
    step: 8,
    type: "add",
    paths: ["index.html"],
    command: "git add index.html",
    caption: "You put `index.html` in the staging box, ready for the next snapshot.",
    snapshotAfter: snap8,
  },
  {
    step: 9,
    type: "commit",
    commitId: c4.id,
    branch: "feature",
    command: "git commit -m \"Style button\"",
    caption: "You saved \"Style button\" on `feature`. Only `feature` moved forward. `main` stayed behind on the same line.",
    snapshotAfter: snap9,
  },
  {
    step: 10,
    type: "checkout",
    branch: "main",
    command: "git checkout main",
    caption: "You switched back to `main`.",
    snapshotAfter: snap10,
  },
  {
    step: 11,
    type: "merge",
    into: "main",
    from: "feature",
    fastForward: true,
    command: "git merge feature",
    caption: "`main` had no new work, so git just slid the `main` label forward to `feature`'s latest commit. No new commit was created.",
    snapshotAfter: snap11,
  },
  {
    step: 12,
    type: "push",
    branch: "main",
    accepted: true,
    sentCommitIds: [c3.id, c4.id],
    command: "git push",
    caption: "You sent copies of your new commits to GitHub, and GitHub accepted them. Its `main` moved up, and so did your `origin/main` bookmark.",
    snapshotAfter: snap12,
  },
  {
    step: 13,
    type: "remote-commit",
    commitId: c5.id,
    by: "Bot teammate",
    command: "(teammate pushes to GitHub)",
    caption: "A teammate pushed a commit to GitHub. Your computer does not know about it yet.",
    snapshotAfter: snap13,
  },
  {
    step: 14,
    type: "edit",
    path: "login.js",
    command: "edit login.js",
    caption: "You changed `login.js` again. It is marked as modified.",
    snapshotAfter: snap14,
  },
  {
    step: 15,
    type: "add",
    paths: ["login.js"],
    command: "git add login.js",
    caption: "You put `login.js` in the staging box.",
    snapshotAfter: snap15,
  },
  {
    step: 16,
    type: "commit",
    commitId: c6.id,
    branch: "main",
    command: "git commit -m \"Fix typo\"",
    caption: "You saved \"Fix typo\" on `main`. Now you and GitHub have both added a commit after the same one, so the history splits here.",
    snapshotAfter: snap16,
  },
  {
    step: 17,
    type: "push",
    branch: "main",
    accepted: false,
    sentCommitIds: [c6.id],
    command: "git push",
    caption: "GitHub said no. It has a commit you don't have yet, and pushing now would erase it. Pull first, then push again.",
    snapshotAfter: snap16,
  },
  {
    step: 18,
    type: "fetch",
    newCommitIds: [c5.id],
    command: "git pull",
    group: { command: "git pull", part: 1, of: 2 },
    caption: "Step 1 of 2: your computer downloaded GitHub's new commit. Only `origin/main` moved. Your own `main` hasn't changed yet.",
    snapshotAfter: snap18,
  },
  {
    step: 19,
    type: "merge",
    into: "main",
    from: "origin/main",
    fastForward: false,
    newCommitId: c7.id,
    command: "git pull",
    group: { command: "git pull", part: 2, of: 2 },
    caption: "Step 2 of 2: both sides had new work, so git made a new merge commit with two parents to join them. `main` moved to it.",
    snapshotAfter: snap19,
  },
  {
    step: 20,
    type: "push",
    branch: "main",
    accepted: true,
    sentCommitIds: [c6.id, c7.id],
    command: "git push",
    caption: "This time GitHub accepted your push.",
    snapshotAfter: snap20,
  },
];

// The same list, wrapped with the format version, ready to replay or share later.
export const fakeEventLog: EventLog = {
  formatVersion: FORMAT_VERSION,
  events: fakeEvents,
};
