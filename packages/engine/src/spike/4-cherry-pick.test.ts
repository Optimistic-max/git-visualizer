// 4-cherry-pick.test.ts
// Spike check 4: does cherryPick work? Rebase (v1.5) is built from it:
// rebase copies each commit onto a new parent, which is a cherry-pick.
// A cherry-pick makes a NEW commit (new ID) with the same change and message.

import { describe, expect, it } from "vitest";
import git from "isomorphic-git";
import { makeClock, makeFs, signature } from "./helpers";

// Builds two branches that each have one new commit, then cherry-picks
// feature's commit onto main. Returns the IDs we want to check.
async function cherryPickScenario() {
  const fs = makeFs();
  const clock = makeClock();
  const dir = "/local";

  // Writes a file, stages it and commits it with the fixed author and fake clock.
  async function commitFile(path: string, text: string, message: string) {
    await fs.promises.writeFile(dir + "/" + path, text);
    await git.add({ fs, dir, filepath: path });
    const time = clock();
    return git.commit({ fs, dir, message, author: signature(time), committer: signature(time) });
  }

  await git.init({ fs, dir, defaultBranch: "main" });
  await commitFile("index.html", "<h1>Hi</h1>\n", "Start");

  // feature gets a NEW file. We will copy this commit over to main.
  await git.branch({ fs, dir, ref: "feature", checkout: true });
  const picked = await commitFile("login.js", "let user = null;\n", "Add login");

  // main gets a different change, so the copy needs a new parent.
  await git.checkout({ fs, dir, ref: "main" });
  const mainTip = await commitFile("index.html", "<h1>Hello</h1>\n", "Bigger title");

  // The cherry-pick. It only takes a committer: the author is kept from
  // the original commit, like real git. We still pass the fake clock time.
  const time = clock();
  const copy = await git.cherryPick({ fs, dir, oid: picked, committer: signature(time) });

  const copyCommit = await git.readCommit({ fs, dir, oid: copy });
  const newMainTip = await git.resolveRef({ fs, dir, ref: "main" });
  const loginText = await fs.promises.readFile(dir + "/login.js", "utf8");

  return { picked, mainTip, copy, copyCommit, newMainTip, loginText };
}

describe("spike 4: cherryPick", () => {
  it("copies a commit onto the current branch as a new commit", async () => {
    const result = await cherryPickScenario();
    console.log("original:", result.picked, " copy:", result.copy);

    // The copy is a NEW commit with a NEW ID.
    expect(result.copy).not.toBe(result.picked);
    // Its parent is main's old tip (not the original's parent).
    expect(result.copyCommit.commit.parent).toEqual([result.mainTip]);
    // Same message as the original.
    expect(result.copyCommit.commit.message).toBe("Add login\n");
    // main moved forward to the copy.
    expect(result.newMainTip).toBe(result.copy);
    // The change came along: login.js now exists on main.
    expect(result.loginText).toBe("let user = null;\n");
  });

  it("gives the copy the same ID every time (needed for share links)", async () => {
    const runA = await cherryPickScenario();
    const runB = await cherryPickScenario();
    expect(runB.copy).toBe(runA.copy);
  });
});
