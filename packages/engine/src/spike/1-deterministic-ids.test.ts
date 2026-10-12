// 1-deterministic-ids.test.ts
// Spike check 1: the same commands must always give the same commit IDs.
// We build the same tiny history twice, in two separate filesystems,
// and check the commit IDs come out identical.

import { describe, expect, it } from "vitest";
import git from "isomorphic-git";
import { makeClock, makeFs, signature } from "./helpers";

// Builds a repo with two commits and returns their IDs.
async function buildHistory() {
  const fs = makeFs();
  const clock = makeClock();
  const dir = "/local";

  await git.init({ fs, dir, defaultBranch: "main" });

  // First commit: add login.js.
  await fs.promises.writeFile(dir + "/login.js", "let user = null;\n");
  await git.add({ fs, dir, filepath: "login.js" });
  // One clock tick per commit. Author and committer share the same time.
  const time1 = clock();
  const first = await git.commit({
    fs,
    dir,
    message: "Add login",
    author: signature(time1),
    committer: signature(time1),
  });

  // Second commit: change login.js.
  await fs.promises.writeFile(dir + "/login.js", "let user = 'ada';\n");
  await git.add({ fs, dir, filepath: "login.js" });
  const time2 = clock();
  const second = await git.commit({
    fs,
    dir,
    message: "Fix typo",
    author: signature(time2),
    committer: signature(time2),
  });

  return [first, second];
}

describe("spike 1: deterministic commit IDs", () => {
  it("gives the same IDs when the same commits are made twice", async () => {
    const runA = await buildHistory();
    const runB = await buildHistory();

    // Show the IDs in the test output so we can see them.
    console.log("run A:", runA);
    console.log("run B:", runB);

    expect(runB).toEqual(runA);
  });

  it("gives two different commits two different IDs", async () => {
    const ids = await buildHistory();
    expect(ids[0]).not.toBe(ids[1]);
  });
});
