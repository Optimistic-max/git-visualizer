// edit.test.ts
// Checks the "Edit a file" button marks the file modified and changes nothing else.

import { describe, expect, it } from "vitest";
import { takeSnapshot } from "../snapshot";
import { makeTestRepo } from "../testRepo";
import { runEdit } from "./edit";

describe("runEdit", () => {
  it("marks the file modified and leaves history alone", async () => {
    const repo = await makeTestRepo();
    const before = await takeSnapshot(repo);

    const event = await runEdit(repo, "login.js");
    const after = event.snapshotAfter;

    expect(event.type).toBe("edit");
    expect(event.step).toBe(1);
    expect(event.path).toBe("login.js");
    expect(event.command).toBe("edit login.js");
    expect(event.caption).toContain("login.js");

    // Only login.js is modified. Nothing is staged.
    expect(after.local.workingFiles).toEqual([
      { path: "index.html", status: "clean" },
      { path: "login.js", status: "modified" },
    ]);
    expect(after.local.staged).toEqual([]);

    // The history, the labels and HEAD did not change.
    expect(after.local.commits).toEqual(before.local.commits);
    expect(after.local.branches).toEqual(before.local.branches);
    expect(after.local.head).toBe(before.local.head);
  });

  it("numbers events 1, 2, 3", async () => {
    const repo = await makeTestRepo();
    const first = await runEdit(repo, "login.js");
    const second = await runEdit(repo, "index.html");
    expect(first.step).toBe(1);
    expect(second.step).toBe(2);
  });

  it("refuses a file that does not exist", async () => {
    const repo = await makeTestRepo();
    await expect(runEdit(repo, "nope.js")).rejects.toThrow("There is no file called nope.js");
  });

  it("writes the same text every run", async () => {
    const repoA = await makeTestRepo();
    const repoB = await makeTestRepo();
    await runEdit(repoA, "login.js");
    await runEdit(repoB, "login.js");
    const textA = await repoA.fs.promises.readFile("/local/login.js", "utf8");
    const textB = await repoB.fs.promises.readFile("/local/login.js", "utf8");
    expect(textB).toBe(textA);
  });
});
