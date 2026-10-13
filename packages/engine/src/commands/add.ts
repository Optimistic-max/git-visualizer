// add.ts
// git add <file>: puts a copy of the file, as it is right now, in the staging box.
// Like real git, adding a file with no new changes does nothing and is not an error.

import git from "isomorphic-git";
import type { AddEvent } from "../events";
import { nextStep } from "../practiceRepo";
import type { PracticeRepo } from "../practiceRepo";
import { takeSnapshot } from "../snapshot";

export async function runAdd(repo: PracticeRepo, path: string): Promise<AddEvent> {
  // Look up this one file. A row is [path, head, workdir, stage]
  // (the numbers are explained in snapshot.ts).
  const rows = await git.statusMatrix({ fs: repo.fs, dir: repo.dir, filepaths: [path] });
  // filepaths also matches folders, so look for the exact file name.
  let row = null;
  for (const candidate of rows) {
    if (candidate[0] === path) {
      row = candidate;
    }
  }
  if (row === null) {
    throw new Error("There is no file called " + path + " in the working folder.");
  }
  const workdir = row[2];
  const stage = row[3];

  // Nothing new to stage when the staging box already matches the working file:
  //   stage 2 = the staging box already has this exact version, or
  //   workdir 1 and stage 1 = the file is unchanged since the last commit.
  const nothingNew = stage === 2 || (workdir === 1 && stage === 1);

  await git.add({ fs: repo.fs, dir: repo.dir, filepath: path });

  let caption =
    "You put `" + path + "` in the staging box. Staging holds a copy of the file as it is right now. Nothing is saved to history yet.";
  let stagedPaths = [path];
  if (nothingNew) {
    caption = "`" + path + "` has no new changes, so there was nothing new to put in the staging box.";
    stagedPaths = [];
  }

  return {
    step: nextStep(repo),
    type: "add",
    paths: stagedPaths,
    command: "git add " + path,
    caption: caption,
    snapshotAfter: await takeSnapshot(repo),
  };
}
