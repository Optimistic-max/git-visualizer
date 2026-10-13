// testRepo.ts
// For tests only: a fresh practice repo in a brand-new in-memory filesystem.
// Each test that calls this starts from exactly the same place.

import { Volume, createFsFromVolume } from "memfs";
import { setupPracticeRepo } from "./practiceRepo";

export function makeTestRepo() {
  const fs = createFsFromVolume(new Volume());
  return setupPracticeRepo(fs);
}
