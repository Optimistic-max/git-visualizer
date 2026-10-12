# Spike results (Oct 12 2026)

What the spike in `docs/SYSTEM_DESIGN.md` §11 found. Tested with isomorphic-git 1.44.2 on memfs, in Node (Vitest).
Each check is one test file in this folder. Run them with `npm test -w packages/engine`.

| # | Check | Result |
|---|---|---|
| 1 | Deterministic commit IDs | Pass |
| 2 | Copy commits local to remote with `readObject` / `writeObject` | Pass |
| 3 | `merge` with `abortOnConflict: false` | Pass, with surprises |
| 4 | `cherryPick` | Pass |
| 5 | lightning-fs in WebKit | Not done yet (needs Playwright) |

## What we learned

1. **Time zone is part of the commit ID.** If `timezoneOffset` is left out, isomorphic-git uses the computer's time zone, so the same commands give different IDs on different machines (and on CI, which runs in UTC). We pass `timezoneOffset: 0` every time.
2. **No "copy a commit" function exists.** The pretend GitHub walks the objects itself: commit, then tree (folders, recursively), then blobs (files), parents first. Then it moves the branch with `writeRef`. It is about 40 lines and copies only what the other side is missing. A bare remote repo works (use `gitdir`, not `dir`).
3. **Commit messages come back with a newline on the end** (`"Add login\n"`). Trim them when building a snapshot.
4. **A conflicting merge always throws `MergeConflictError`**, even with `abortOnConflict: false`. That option only decides whether the half-done merge is written to the files. The error's `data` lists the files and the kind of conflict (`bothModified`, `deleteByUs`, `deleteByTheirs`).
5. **Conflict markers say the branch name, not `HEAD`.** isomorphic-git writes `<<<<<<< main`. Real git writes `<<<<<<< HEAD`. If we show the file, rewrite that label to match real git.
6. **No `MERGE_HEAD`.** isomorphic-git does not remember an unfinished merge. After a conflict is resolved, the engine must remember the other side and call `git.commit` with `parent: [ours, theirs]` itself.
7. **`cherryPick` takes only a `committer`.** The author and the author's time are kept from the original commit, like real git. If `committer` is left out, it falls back to `Date.now()` and IDs stop being repeatable. Same commands twice gave the same copy ID.

## Changes to make in SYSTEM_DESIGN.md

- **§5 Deterministic IDs and AGENTS.md:** "fixed author, fixed **time zone** (`timezoneOffset: 0`), fake clock". Also say "pass `committer` on every `cherryPick`" (it has no `author` option).
- **§5 Pretend GitHub logic:** describe the copy as "walk commit, tree and blob objects, parents first, skip what the other side has, then `writeRef`". Note the remote is a bare repo.
- **§5 Running a command, step 4 (snapshot after):** trim the newline from commit messages.
- **§10 Conflicts (v1.5):** catch `MergeConflictError` and use its `data` for the `conflict` event. Rewrite `<<<<<<< <branch>` to `<<<<<<< HEAD`. The engine keeps the "merge in progress" state itself, because there is no `MERGE_HEAD`.
- **§11:** mark risks 1 to 4 as proven, and keep 5 (WebKit + lightning-fs) open until Playwright is set up.
- **§8 Testing:** each real engine test should start from a fresh filesystem. (The spike's copy test shares state between its two tests on purpose. Real tests should not.)
