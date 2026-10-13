// edit.ts
// The "Edit a file" button. It is NOT a git command: it changes a file in the
// working folder so there is something to add and commit.
// It adds one line to the end of the file. The line includes a counter, so
// every edit writes different text (and the same edits always write the same text).

import type { EditEvent } from "../events";
import { nextStep } from "../practiceRepo";
import type { PracticeRepo } from "../practiceRepo";
import { takeSnapshot } from "../snapshot";

// Makes the line to add. HTML files get an HTML comment, other files a "//" comment.
function editLine(path: string, count: number) {
  if (path.endsWith(".html")) {
    return "<!-- edit " + count + " -->\n";
  }
  return "// edit " + count + "\n";
}

export async function runEdit(repo: PracticeRepo, path: string): Promise<EditEvent> {
  const fullPath = repo.dir + "/" + path;

  // Read the file first. readFile throws if the file does not exist.
  let text: string;
  try {
    text = await repo.fs.promises.readFile(fullPath, "utf8");
  } catch {
    throw new Error("There is no file called " + path + " in the working folder.");
  }

  // Was this file already in the staging box? We check before editing,
  // so the caption can remind the learner to add it again.
  const before = await takeSnapshot(repo);
  const wasStaged = before.local.staged.includes(path);

  repo.editCount = repo.editCount + 1;
  await repo.fs.promises.writeFile(fullPath, text + editLine(path, repo.editCount));

  let caption =
    "You changed `" + path + "`. Git can tell it is different from the last commit, so it is marked as modified.";
  if (wasStaged) {
    caption =
      caption + " The staging box still holds the older copy, so add it again to include this change.";
  }

  return {
    step: nextStep(repo),
    type: "edit",
    path: path,
    command: "edit " + path,
    caption: caption,
    snapshotAfter: await takeSnapshot(repo),
  };
}
