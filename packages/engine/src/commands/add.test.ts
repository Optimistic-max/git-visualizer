// add.test.ts
// Checks git add puts a modified file in the staging box and changes nothing else.

import { describe, expect, it } from "vitest";
import { takeSnapshot } from "../snapshot";
import { makeTestRepo } from "../testRepo";
import { runAdd } from "./add";
import { runEdit } from "./edit";

describe("runAdd", () => {
  it("stages a modified file and leaves history alone", async () => {
    const repo = await makeTestRepo();
    const before = await takeSnapshot(repo);
    await runEdit(repo, "login.js");

    const event = await runAdd(repo, "login.js");
    const after = event.snapshotAfter;

    expect(event.type).toBe("add");
    expect(event.step).toBe(2);
    expect(event.paths).toEqual(["login.js"]);
    expect(event.command).toBe("git add login.js");

    expect(after.local.staged).toEqual(["login.js"]);
    // Still "modified": it is still different from the last commit.
    expect(after.local.workingFiles).toEqual([
      { path: "index.html", status: "clean" },
      { path: "login.js", status: "modified" },
    ]);

    // The history, the labels and HEAD did not change.
    expect(after.local.commits).toEqual(before.local.commits);
    expect(after.local.branches).toEqual(before.local.branches);
    expect(after.local.head).toBe(before.local.head);
  });

  it("stages nothing when the file has no changes", async () => {
    const repo = await makeTestRepo();
    const event = await runAdd(repo, "login.js");
    expect(event.paths).toEqual([]);
    expect(event.caption).toContain("nothing new");
    expect(event.snapshotAfter.local.staged).toEqual([]);
  });

  it("stages nothing new when the same version is added twice", async () => {
    const repo = await makeTestRepo();
    await runEdit(repo, "login.js");
    await runAdd(repo, "login.js");
    const second = await runAdd(repo, "login.js");
    expect(second.paths).toEqual([]);
    // It is still in the staging box from the first add.
    expect(second.snapshotAfter.local.staged).toEqual(["login.js"]);
  });

  it("after editing a staged file, edit says to add it again, and add stages the new copy", async () => {
    const repo = await makeTestRepo();
    await runEdit(repo, "login.js");
    await runAdd(repo, "login.js");

    const edit = await runEdit(repo, "login.js");
    expect(edit.caption).toContain("add it again");

    const add = await runAdd(repo, "login.js");
    expect(add.paths).toEqual(["login.js"]);
  });

  it("refuses a file that does not exist", async () => {
    const repo = await makeTestRepo();
    await expect(runAdd(repo, "nope.js")).rejects.toThrow("There is no file called nope.js");
  });
});
