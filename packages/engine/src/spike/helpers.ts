// helpers.ts
// Small tools shared by the spike tests: an in-memory filesystem,
// the one fixed author, and a fake clock that only counts up.
// The spike tests run in Node, so we use memfs here instead of lightning-fs.

import { Volume, createFsFromVolume } from "memfs";

// A brand-new, empty filesystem that lives only in memory.
// isomorphic-git accepts any object shaped like Node's "fs" module.
export function makeFs() {
  const volume = new Volume();
  return createFsFromVolume(volume);
}

// The fake clock. It starts at a fixed moment and goes up by one second per call.
// We never use Date.now(), so the same steps always give the same times.
export function makeClock() {
  // 1 January 2026, 00:00:00 UTC, in seconds (git stores times in seconds).
  let seconds = 1767225600;
  return function tick() {
    seconds = seconds + 1;
    return seconds;
  };
}

// The fixed author, stamped with one time from the clock.
// We pass this as BOTH author and committer on every commit.
export function signature(timestamp: number) {
  return {
    name: "Git Visualizer",
    email: "learner@git-visualizer.dev",
    timestamp: timestamp,
    // 0 = UTC. Without this, isomorphic-git would use the computer's time zone.
    timezoneOffset: 0,
  };
}
