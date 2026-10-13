// commit.ts
// git commit -m "<message>": saves what is in the staging box as a new commit.
// The current branch label moves forward to the new commit, and HEAD goes with it.
// The author, committer and time come from the fixed author and fake clock, so
// the same commands always give the same commit ID.

import git from "isomorphic-git";
import { authorAt } from "../clock";
import type { CommitEvent } from "../events";
import { nextStep } from "../practiceRepo";
import type { PracticeRepo } from "../practiceRepo";
import { takeSnapshot } from "../snapshot";

export async function runCommit(repo: PracticeRepo, message: string): Promise<CommitEvent> {
  if (message.trim() === "") {
    throw new Error("A commit needs a message. Try: git commit -m \"Describe your change\"");
  }

  // Real git refuses to commit when the staging box is empty. So do we.
  const before = await takeSnapshot(repo);
  if (before.local.staged.length === 0) {
    throw new Error("Nothing to commit: the staging box is empty. Use git add first.");
  }
  // The branch HEAD is on. This is the label that will move forward.
  const branch = before.local.head;

  // One tick of the fake clock, used for both author and committer.
  const time = repo.clock();
  const commitId = await git.commit({
    fs: repo.fs,
    dir: repo.dir,
    message: message,
    author: authorAt(time),
    committer: authorAt(time),
  });

  return {
    step: nextStep(repo),
    type: "commit",
    commitId: commitId,
    branch: branch,
    command: "git commit -m \"" + message + "\"",
    caption:
      "You saved a snapshot called \"" + message + "\". `" + branch + "` moved forward to it, and HEAD came along.",
    // takeSnapshot trims the newline git adds to the end of every message.
    snapshotAfter: await takeSnapshot(repo),
  };
}
