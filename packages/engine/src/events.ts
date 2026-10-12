// events.ts
// This file is the CONTRACT between the engine and the graph.
// The engine produces events. The graph and the web app read them.
// If you change this file, both Emmanuel and Samuel must agree.
// Status: draft v0. We agree on the final version before building on it.

// The version of the saved event format.
// Later, saved share links will carry this number so old links keep working.
export const FORMAT_VERSION = 1;

// One commit (one dot on the graph).
export type Commit = {
  id: string;          // the commit ID, a short string like "a1b2c3d"
  parents: string[];   // IDs of the commits before this one. Usually 1. A merge commit has 2. The first commit has 0.
  message: string;     // the commit message, like "Add login"
};

// One repo (the user's repo, or the pretend GitHub repo).
export type RepoState = {
  commits: Record<string, Commit>;   // every commit, looked up by its ID
  branches: Record<string, string>;  // branch name -> the commit ID it points to. Example: { main: "a1b2c3d" }
};

// One file in the working folder.
// "modified" means the file is different from the last commit.
// A file can be modified AND staged at the same time (staged = its path is in the staged list).
export type WorkingFile = {
  path: string;                    // the file name, like "login.js"
  status: "clean" | "modified";
};

// The local repo is a repo plus a few extra things.
export type LocalState = RepoState & {
  head: string;                           // the name of the branch HEAD is on. Example: "main"
  remoteBranches: Record<string, string>; // your laptop's copy of GitHub. Example: { "origin/main": "a1b2c3d" }
  workingFiles: WorkingFile[];            // the files in the working folder
  staged: string[];                       // paths of the files in the staging box
};

// The full picture at one moment: your repo AND the pretend GitHub.
export type Snapshot = {
  local: LocalState;
  remote: RepoState;
};

// Some commands are really two steps. This ties the events together.
// Example: "git pull" is a fetch (part 1 of 2) and then a merge (part 2 of 2).
export type EventGroup = {
  command: string;   // the command the steps belong to, like "git pull"
  part: number;      // which step this event is: 1, 2, ...
  of: number;        // how many steps there are in total
};

// Things every event has, no matter what type it is.
type EventBase = {
  step: number;               // 1, 2, 3, ... the order the events happened in
  command: string;            // what the user typed or clicked, like "git commit -m \"Add login\""
  caption: string;            // plain-English sentence under the graph. Screen readers read it too.
  group?: EventGroup;         // only set when this event is one step of a longer command
  snapshotAfter: Snapshot;    // the full picture right AFTER this event
};

// Each event type adds its own details.
// "type" is the tag that tells us which kind of event it is.

// Practice repo copied down from the pretend GitHub (whole history).
export type CloneEvent = EventBase & {
  type: "clone";
};

// A file in the working folder was changed.
// This comes from the "Edit a file" button, NOT from a git command.
// We need it, because there is nothing to add until a file is modified.
export type EditEvent = EventBase & {
  type: "edit";
  path: string;       // the file that was changed
};

// Files were moved into the staging box (git add).
export type AddEvent = EventBase & {
  type: "add";
  paths: string[];    // the files that were staged
};

// A new commit on the current branch.
export type CommitEvent = EventBase & {
  type: "commit";
  commitId: string;   // the new commit
  branch: string;     // the branch that moved forward
};

// A new label on the current commit. The line does NOT fork.
export type BranchCreateEvent = EventBase & {
  type: "branch-create";
  name: string;       // the new branch name
  atCommit: string;   // the commit it was put on
};

// HEAD moves to another branch.
export type CheckoutEvent = EventBase & {
  type: "checkout";
  branch: string;     // the branch HEAD moved to
};

// One branch merged into another.
export type MergeEvent = EventBase & {
  type: "merge";
  into: string;               // the branch being updated, like "main"
  from: string;               // the branch (or "origin/main") being merged in
  fastForward: boolean;       // true = no new dot, label just slides. false = new merge commit.
  newCommitId?: string;       // only set when fastForward is false
};

// Your laptop's copy of GitHub (origin/main) catches up. Your own main does not move.
export type FetchEvent = EventBase & {
  type: "fetch";
  newCommitIds: string[];     // the commits that came down
};

// You send commits up to the pretend GitHub.
export type PushEvent = EventBase & {
  type: "push";
  branch: string;
  accepted: boolean;          // false = rejected, the copies bounce back
  sentCommitIds: string[];    // the commits that were sent
};

// The bot teammate pushed a commit to the pretend GitHub.
export type RemoteCommitEvent = EventBase & {
  type: "remote-commit";
  commitId: string;
  by: string;                 // the bot's name
};

// Later (v1.5) we will add: conflict, rebase, reset, revert.
//  - rebase makes NEW commits, so it will carry an "idMap" (old ID -> new ID)
//    so the graph can animate old dots turning into new ones.
//  - reset does not rewrite anything. It only moves a branch label backward.
//  - revert adds a new commit that undoes an old one.

// Any one event is one of the types above.
export type GitEvent =
  | CloneEvent
  | EditEvent
  | AddEvent
  | CommitEvent
  | BranchCreateEvent
  | CheckoutEvent
  | MergeEvent
  | FetchEvent
  | PushEvent
  | RemoteCommitEvent;

// A saved list of events, ready to be replayed or shared.
export type EventLog = {
  formatVersion: number;
  events: GitEvent[];
};
