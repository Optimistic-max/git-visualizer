// index.ts
// The front door of the engine package.
// Other packages write `import { fakeEvents } from "@git-visualizer/engine"`
// and get whatever is listed here. Anything not listed here is private to the engine.

export * from "./events";
export { fakeEvents, fakeEventLog } from "./fakeStream";

// The real engine: set up the practice repo, read it, and run commands on it.
export { setupPracticeRepo } from "./practiceRepo";
export type { PracticeRepo } from "./practiceRepo";
export { takeSnapshot } from "./snapshot";
export { runEdit } from "./commands/edit";
export { runAdd } from "./commands/add";
export { runCommit } from "./commands/commit";
