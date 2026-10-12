// fakeStream.test.ts
// A first small test so Vitest has something to run.
// It checks that the hand-written fake events are in order and all have captions.

import { describe, expect, it } from "vitest";
import { fakeEvents } from "./fakeStream";

describe("fakeEvents", () => {
  it("numbers the steps 1, 2, 3, ... with no gaps", () => {
    for (let i = 0; i < fakeEvents.length; i++) {
      expect(fakeEvents[i].step).toBe(i + 1);
    }
  });

  it("gives every event a caption", () => {
    for (const event of fakeEvents) {
      expect(event.caption.length).toBeGreaterThan(0);
    }
  });
});
