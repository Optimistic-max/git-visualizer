// clock.ts
// Who made each commit and when. Commit IDs are worked out from the author,
// the time and the parents, so these must be the same every run:
// one fixed author, a fake clock that only counts up, and the UTC time zone.
// Never call Date.now() in the engine.

// Makes a fake clock. Each call returns a time one second later than the last.
export function makeClock() {
  // 1 January 2026, 00:00:00 UTC, in seconds (git stores times in seconds).
  let seconds = 1767225600;
  return function tick() {
    seconds = seconds + 1;
    return seconds;
  };
}

// The fixed author, stamped with one time from the clock.
// Pass this as BOTH author and committer on every commit and merge.
export function authorAt(timestamp: number) {
  return {
    name: "Git Visualizer",
    email: "learner@git-visualizer.dev",
    timestamp: timestamp,
    // 0 = UTC. If we left this out, isomorphic-git would use the computer's
    // own time zone, and the same commands would give different IDs on
    // different computers (see spike/SPIKE_RESULTS.md).
    timezoneOffset: 0,
  };
}
