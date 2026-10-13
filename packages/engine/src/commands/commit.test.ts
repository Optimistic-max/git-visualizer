// commit.test.ts
// Checks git commit adds one new dot, moves the branch label (and HEAD) to it,
// empties the staging box, and gives the same IDs every run.
// We compare structure (commits, parents, labels), never the ID text itself.

import { describe, expect, it } from "vitest";
import type { CommitEvent } from "../events";
import type { PracticeRepo } from "../practiceRepo";
import { takeSnapshot } from "../snapshot";
import { makeTestRepo } from "../testRepo";
import { runAdd } from "./add";
import { runCommit } from "./commit";
import { runEdit } from "./edit";

// edit, add, commit: the usual three steps for one change.
async function change(repo: PracticeRepo, path: string, message: string) {
  await runEdit(repo, path);
  await runAdd(repo, path);
  return runCommit(repo, message);
}

describe("runCommit", () => {
  it("adds one commit whose parent is the old tip, and moves main to it", async () => {
    const repo = await makeTestRepo();
    const before = await takeSnapshot(repo);
    const oldTip = before.local.branches.main;

    const event = await change(repo, "login.js", "Add login");
    const after = event.snapshotAfter;

    expect(event.type).toBe("commit");
    expect(event.step).toBe(3);
    expect(event.branch).toBe("main");
    expect(event.command).toBe("git commit -m \"Add login\"");
    expect(event.caption).toContain("Add login");

    // Exactly one new commit.
    expect(Object.keys(after.local.commits).length).toBe(2);
    const newCommit = after.local.commits[event.commitId];
    // Its parent is where main was before. The message has no trailing newline.
    expect(newCommit.parents).toEqual([oldTip]);
    expect(newCommit.message).toBe("Add login");

    // The main label moved to the new commit, and HEAD is still on main.
    expect(after.local.branches).toEqual({ main: event.commitId });
    expect(after.local.head).toBe("main");

    // The staging box is empty and the files are clean again.
    expect(after.local.staged).toEqual([]);
    expect(after.local.workingFiles).toEqual([
      { path: "index.html", status: "clean" },
      { path: "login.js", status: "clean" },
    ]);

    // GitHub knows nothing about it.
    expect(after.remote).toEqual(before.remote);
  });

  it("makes a straight line: each commit's parent is the one before", async () => {
    const repo = await makeTestRepo();
    const first = await change(repo, "login.js", "Add login");
    const second = await change(repo, "index.html", "Style button");
    const commits = second.snapshotAfter.local.commits;
    expect(commits[second.commitId].parents).toEqual([first.commitId]);
    expect(second.snapshotAfter.local.branches.main).toBe(second.commitId);
  });

  it("refuses when nothing is staged", async () => {
    const repo = await makeTestRepo();
    await runEdit(repo, "login.js");
    await expect(runCommit(repo, "Add login")).rejects.toThrow("Nothing to commit");
  });

  it("refuses an empty message", async () => {
    const repo = await makeTestRepo();
    await runEdit(repo, "login.js");
    await runAdd(repo, "login.js");
    await expect(runCommit(repo, "  ")).rejects.toThrow("needs a message");
  });

  it("gives the same IDs when the same commands run twice", async () => {
    // Runs the same story in a fresh repo and returns its commit events.
    async function story() {
      const repo = await makeTestRepo();
      const events: CommitEvent[] = [];
      events.push(await change(repo, "login.js", "Add login"));
      events.push(await change(repo, "index.html", "Style button"));
      events.push(await change(repo, "login.js", "Fix typo"));
      return events;
    }
    const runA = await story();
    const runB = await story();

    for (let i = 0; i < runA.length; i++) {
      expect(runB[i].commitId).toBe(runA[i].commitId);
    }
    // The whole picture matches too, not just the IDs.
    expect(runB[2].snapshotAfter).toEqual(runA[2].snapshotAfter);
  });
});
