// practiceRepo.test.ts
// Checks the practice repo starts the way every lesson expects.

import { describe, expect, it } from "vitest";
import { takeSnapshot } from "./snapshot";
import { makeTestRepo } from "./testRepo";

describe("setupPracticeRepo", () => {
  it("starts with one commit on main, HEAD on main, clean files", async () => {
    const repo = await makeTestRepo();
    const snap = await takeSnapshot(repo);

    const ids = Object.keys(snap.local.commits);
    expect(ids.length).toBe(1);
    const first = snap.local.commits[ids[0]];
    // The first commit has no parents, and the message has no trailing newline.
    expect(first.parents).toEqual([]);
    expect(first.message).toBe("Start project");

    expect(snap.local.branches).toEqual({ main: first.id });
    expect(snap.local.head).toBe("main");
    expect(snap.local.remoteBranches).toEqual({});
    expect(snap.local.workingFiles).toEqual([
      { path: "index.html", status: "clean" },
      { path: "login.js", status: "clean" },
    ]);
    expect(snap.local.staged).toEqual([]);
  });

  it("starts with an empty pretend GitHub", async () => {
    const repo = await makeTestRepo();
    const snap = await takeSnapshot(repo);
    expect(snap.remote).toEqual({ commits: {}, branches: {} });
  });

  it("gives the starting commit the same ID every time", async () => {
    const snapA = await takeSnapshot(await makeTestRepo());
    const snapB = await takeSnapshot(await makeTestRepo());
    expect(snapB.local.branches.main).toBe(snapA.local.branches.main);
  });
});
