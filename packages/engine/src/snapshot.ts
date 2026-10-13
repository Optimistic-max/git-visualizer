// snapshot.ts
// Reads both repos and returns a Snapshot (see events.ts): every commit,
// where each label points, where HEAD is, and the state of the working files.
// Every command calls this at the end to build its snapshotAfter.

import git from "isomorphic-git";
import type { PromiseFsClient } from "isomorphic-git";
import type { Commit, LocalState, RepoState, Snapshot, WorkingFile } from "./events";
import type { PracticeRepo } from "./practiceRepo";

// isomorphic-git gives commit messages back with a newline on the end
// ("Add login\n"). We remove it so labels and captions do not carry it.
export function trimMessage(message: string) {
  if (message.endsWith("\n")) {
    return message.slice(0, -1);
  }
  return message;
}

// Where a repo lives. Your repo uses "dir"; the bare pretend GitHub uses "gitdir".
type Where = { dir?: string; gitdir?: string };

// Adds every commit reachable from one ref (a branch name or a commit ID) to the commits map.
async function addHistory(
  fs: PromiseFsClient,
  where: Where,
  ref: string,
  commits: Record<string, Commit>,
) {
  const entries = await git.log({ fs, ...where, ref: ref });
  for (const entry of entries) {
    commits[entry.oid] = {
      id: entry.oid,
      parents: entry.commit.parent,
      message: trimMessage(entry.commit.message),
    };
  }
}

// Reads one repo's branches and all the commits they can reach.
async function readRepo(fs: PromiseFsClient, where: Where): Promise<RepoState> {
  const commits: Record<string, Commit> = {};
  const branches: Record<string, string> = {};
  const names = await git.listBranches({ fs, ...where });
  for (const name of names) {
    branches[name] = await git.resolveRef({ fs, ...where, ref: name });
    await addHistory(fs, where, name, commits);
  }
  return { commits, branches };
}

// Reads the working folder and the staging box.
// statusMatrix gives one row per file: [path, head, workdir, stage]
//   head:    0 = not in the last commit, 1 = in it
//   workdir: 0 = missing, 1 = same as the last commit, 2 = different
//   stage:   0 = not staged, 1 = same as the last commit,
//            2 = same as the working file, 3 = different from both
async function readFiles(repo: PracticeRepo) {
  const rows = await git.statusMatrix({ fs: repo.fs, dir: repo.dir });
  const workingFiles: WorkingFile[] = [];
  const staged: string[] = [];
  for (const row of rows) {
    const path = row[0];
    const head = row[1];
    const workdir = row[2];
    const stage = row[3];

    // "modified" means the working file differs from the last commit.
    if (workdir === 1) {
      workingFiles.push({ path: path, status: "clean" });
    } else {
      workingFiles.push({ path: path, status: "modified" });
    }

    // A file is staged when the staging box differs from the last commit.
    // stage 2 or 3 always differs. stage 0 differs only if the file was in the last commit.
    if (stage === 2 || stage === 3 || (stage === 0 && head === 1)) {
      staged.push(path);
    }
  }
  return { workingFiles, staged };
}

// Takes the full picture of both repos right now.
export async function takeSnapshot(repo: PracticeRepo): Promise<Snapshot> {
  const fs = repo.fs;
  const localWhere = { dir: repo.dir };

  const localRepo = await readRepo(fs, localWhere);

  // HEAD is always on a branch in v1 (we never detach it).
  const head = await git.currentBranch({ fs, dir: repo.dir });
  if (typeof head !== "string") {
    throw new Error("HEAD is not on a branch.");
  }

  // Your laptop's copy of GitHub's branches, like "origin/main".
  const remoteBranches: Record<string, string> = {};
  const remoteNames = await git.listBranches({ fs, dir: repo.dir, remote: "origin" });
  for (const name of remoteNames) {
    // "origin/HEAD" only points at another branch. It is not a real label, so skip it.
    if (name === "HEAD") {
      continue;
    }
    const id = await git.resolveRef({ fs, dir: repo.dir, ref: "refs/remotes/origin/" + name });
    remoteBranches["origin/" + name] = id;
    // After a fetch, some commits are reachable only from origin/main. They are still on your laptop.
    await addHistory(fs, localWhere, id, localRepo.commits);
  }

  const files = await readFiles(repo);

  const local: LocalState = {
    commits: localRepo.commits,
    branches: localRepo.branches,
    head: head,
    remoteBranches: remoteBranches,
    workingFiles: files.workingFiles,
    staged: files.staged,
  };
  const remote = await readRepo(fs, { gitdir: repo.remoteGitdir });

  return { local, remote };
}
