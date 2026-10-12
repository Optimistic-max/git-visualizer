// index.ts
// The front door of the engine package.
// Other packages write `import { fakeEvents } from "@git-visualizer/engine"`
// and get whatever is listed here. Anything not listed here is private to the engine.

export * from "./events";
export { fakeEvents, fakeEventLog } from "./fakeStream";
