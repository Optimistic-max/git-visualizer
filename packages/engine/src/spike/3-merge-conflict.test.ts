// 3-merge-conflict.test.ts
// Spike check 3: what does merge write into a file when both sides
// changed the same line? (Needed for the conflict feature in v1.5.)
// With abortOnConflict: false, isomorphic-git should leave conflict
// markers in the file instead of giving up and leaving the file alone.

import { describe, expect, it } from "vitest";
import git, { Errors } from "isomorphic-git";
import { makeClock, makeFs, signature } from "./helpers";

describe("spike 3: merge with abortOnConflict: false", () => {
  it("writes conflict markers into the file", async () => {
    const fs = makeFs();
    const clock = makeClock();
    const dir = "/local";
    const file = dir + "/greeting.txt";

    // Makes a commit of everything staged, with the fixed author and fake clock.
    async function commit(message: string) {
      const time = clock();
      return git.commit({ fs, dir, message, author: signature(time), committer: signature(time) });
    }

    // The starting point: one file with one line, on main.
    await git.init({ fs, dir, defaultBranch: "main" });
    await fs.promises.writeFile(file, "Hello\n");
    await git.add({ fs, dir, filepath: "greeting.txt" });
    await commit("Start");

    // On a new branch "feature", change the line one way.
    await git.branch({ fs, dir, ref: "feature", checkout: true });
    await fs.promises.writeFile(file, "Hello from feature\n");
    await git.add({ fs, dir, filepath: "greeting.txt" });
    await commit("Feature greeting");

    // Back on main, change the SAME line another way.
    await git.checkout({ fs, dir, ref: "main" });
    await fs.promises.writeFile(file, "Hello from main\n");
    await git.add({ fs, dir, filepath: "greeting.txt" });
    await commit("Main greeting");

    // Merge feature into main. We expect it to fail with a conflict error.
    const time = clock();
    let caught: unknown = null;
    try {
      await git.merge({
        fs,
        dir,
        ours: "main",
        theirs: "feature",
        abortOnConflict: false,
        author: signature(time),
        committer: signature(time),
      });
    } catch (error) {
      caught = error;
    }

    // Show what came back and what is now in the file.
    console.log("error:", caught);
    const text = await fs.promises.readFile(file, "utf8");
    console.log("file after merge:\n" + text);

    // It should be a MergeConflictError, not some other failure.
    expect(caught).toBeInstanceOf(Errors.MergeConflictError);
    // Both sides are kept in the file, between conflict markers.
    expect(text).toContain("<<<<<<<");
    expect(text).toContain("Hello from main");
    expect(text).toContain("=======");
    expect(text).toContain("Hello from feature");
    expect(text).toContain(">>>>>>>");

    // No merge commit was made: main still points at "Main greeting".
    const log = await git.log({ fs, dir, ref: "main", depth: 1 });
    expect(log[0].commit.message).toBe("Main greeting\n");
  });
});
