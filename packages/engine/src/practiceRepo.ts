// practiceRepo.ts
// Sets up the practice repo: your repo (/local) with a starting commit,
// and an empty pretend GitHub repo (/remote.git) that clone and push will fill later.
// Every command takes the PracticeRepo object this returns.

import git from "isomorphic-git";
import type { PromiseFsClient } from "isomorphic-git";
import { authorAt, makeClock } from "./clock";

// Everything a command needs to know about the practice repo.
export type PracticeRepo = {
  fs: PromiseFsClient;   // the in-memory filesystem (memfs in tests, lightning-fs in the browser)
  dir: string;           // your repo's folder
  remoteGitdir: string;  // the pretend GitHub repo's folder (a "bare" repo, no working files)
  clock: () => number;   // the fake clock, one second later on every call
  step: number;          // the step number of the last event (0 before any event)
  editCount: number;     // how many times "Edit a file" was used, so each edit writes different text
};

// Creates both repos in the filesystem you pass in and returns the PracticeRepo.
export async function setupPracticeRepo(fs: PromiseFsClient): Promise<PracticeRepo> {
  const repo: PracticeRepo = {
    fs: fs,
    dir: "/local",
    remoteGitdir: "/remote.git",
    clock: makeClock(),
    step: 0,
    editCount: 0,
  };

  // Your repo, with the starting files.
  await git.init({ fs, dir: repo.dir, defaultBranch: "main" });
  await fs.promises.writeFile(repo.dir + "/index.html", "<h1>My project</h1>\n");
  await fs.promises.writeFile(repo.dir + "/login.js", "let user = null;\n");
  await git.add({ fs, dir: repo.dir, filepath: "index.html" });
  await git.add({ fs, dir: repo.dir, filepath: "login.js" });

  // The first commit. Author and committer share one tick of the fake clock.
  const time = repo.clock();
  await git.commit({
    fs,
    dir: repo.dir,
    message: "Start project",
    author: authorAt(time),
    committer: authorAt(time),
  });

  // The pretend GitHub: an empty bare repo for now.
  await git.init({ fs, dir: repo.remoteGitdir, bare: true, defaultBranch: "main" });

  return repo;
}

// Gives the next event its step number (1, 2, 3, ...).
export function nextStep(repo: PracticeRepo) {
  repo.step = repo.step + 1;
  return repo.step;
}
