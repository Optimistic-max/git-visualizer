// 2-copy-objects.test.ts
// Spike check 2: can we copy commits from one repo to another by hand?
// isomorphic-git's real push needs a web server, so our pretend GitHub
// will copy git objects itself with readObject / writeObject.
//
// A commit needs three kinds of objects:
//   - the commit itself (message, author, parents, and which tree it points to)
//   - trees (folders: a list of file names and the objects they point to)
//   - blobs (the contents of each file)
// We copy all of them, then move the remote's branch label.

import { describe, expect, it } from "vitest";
import git from "isomorphic-git";
import { makeClock, makeFs, signature } from "./helpers";

// Both repos live in the SAME memory filesystem, in two folders.
const fs = makeFs();
const clock = makeClock();
const localDir = "/local";
// The remote is a "bare" repo (no working folder), like a real GitHub repo.
// For a bare repo we pass "gitdir" instead of "dir".
const remoteGitdir = "/remote.git";

// Makes one commit in the local repo by writing a file and committing it.
async function commitFile(path: string, text: string, message: string) {
  await fs.promises.writeFile(localDir + "/" + path, text);
  await git.add({ fs, dir: localDir, filepath: path });
  const time = clock();
  return git.commit({
    fs,
    dir: localDir,
    message: message,
    author: signature(time),
    committer: signature(time),
  });
}

// Does the remote already have this object?
// readObject throws an error when the object is missing.
async function remoteHas(oid: string) {
  try {
    await git.readObject({ fs, gitdir: remoteGitdir, oid: oid });
    return true;
  } catch {
    return false;
  }
}

// Copies ONE object from local to remote, exactly as it is.
// format "content" gives the raw bytes, so the remote gets the same ID.
async function copyOneObject(oid: string) {
  const found = await git.readObject({ fs, dir: localDir, oid: oid, format: "content" });
  // With format "content" the type is always one of these four,
  // but TypeScript cannot know that, so we tell it.
  const type = found.type as "blob" | "commit" | "tag" | "tree";
  const newOid = await git.writeObject({
    fs,
    gitdir: remoteGitdir,
    type: type,
    object: found.object as Uint8Array,
    format: "content",
  });
  // The ID is worked out from the content, so it must not change.
  expect(newOid).toBe(oid);
}

// Copies a tree (a folder) and everything inside it.
async function copyTree(treeOid: string) {
  if (await remoteHas(treeOid)) {
    return;
  }
  const tree = await git.readTree({ fs, dir: localDir, oid: treeOid });
  for (const entry of tree.tree) {
    if (entry.type === "tree") {
      // A folder inside the folder: copy it the same way.
      await copyTree(entry.oid);
    } else if (!(await remoteHas(entry.oid))) {
      // A file: copy its blob.
      await copyOneObject(entry.oid);
    }
  }
  await copyOneObject(treeOid);
}

// Copies a commit, its tree, and every parent the remote does not have yet.
// Returns how many commits were copied.
async function copyCommit(commitOid: string): Promise<number> {
  // If the remote has this commit, it has all the history before it too. Stop.
  if (await remoteHas(commitOid)) {
    return 0;
  }
  const result = await git.readCommit({ fs, dir: localDir, oid: commitOid });
  let copied = 0;
  // Parents first, so the remote never has a commit without its history.
  for (const parent of result.commit.parent) {
    copied = copied + (await copyCommit(parent));
  }
  await copyTree(result.commit.tree);
  await copyOneObject(commitOid);
  return copied + 1;
}

// Reads a repo's history as plain data: [{ id, parents, message }], newest first.
async function history(where: { dir?: string; gitdir?: string }) {
  const entries = await git.log({ fs, ...where, ref: "main" });
  const commits = [];
  for (const entry of entries) {
    commits.push({
      id: entry.oid,
      parents: entry.commit.parent,
      message: entry.commit.message,
    });
  }
  return commits;
}

describe("spike 2: copy commits with readObject / writeObject", () => {
  it("copies the whole history to an empty remote (like the first push)", async () => {
    await git.init({ fs, dir: localDir, defaultBranch: "main" });
    await git.init({ fs, dir: remoteGitdir, bare: true, defaultBranch: "main" });

    await commitFile("index.html", "<h1>Hi</h1>\n", "Start project");
    // A file inside a folder, so we also test nested trees.
    await fs.promises.mkdir(localDir + "/src");
    await commitFile("src/login.js", "let user = null;\n", "Add login");
    const tip = await git.resolveRef({ fs, dir: localDir, ref: "main" });

    const copied = await copyCommit(tip);
    // After the objects are there, move the remote's main label to the tip.
    await git.writeRef({ fs, gitdir: remoteGitdir, ref: "refs/heads/main", value: tip, force: true });

    expect(copied).toBe(2);
    expect(await history({ gitdir: remoteGitdir })).toEqual(await history({ dir: localDir }));
  });

  it("copies only the new commit the second time (like a later push)", async () => {
    await commitFile("src/login.js", "let user = 'ada';\n", "Fix typo");
    const tip = await git.resolveRef({ fs, dir: localDir, ref: "main" });

    const copied = await copyCommit(tip);
    await git.writeRef({ fs, gitdir: remoteGitdir, ref: "refs/heads/main", value: tip, force: true });

    // Only "Fix typo" was missing, so only one commit was copied.
    expect(copied).toBe(1);
    const remote = await history({ gitdir: remoteGitdir });
    expect(remote).toEqual(await history({ dir: localDir }));
    // Spot-check the parents: newest first, so remote[0] is "Fix typo".
    expect(remote[0].parents).toEqual([remote[1].id]);
    expect(remote[2].parents).toEqual([]);
  });
});
