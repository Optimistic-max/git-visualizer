// App.tsx
// The whole page. For now it only proves the wiring works:
// it reads the fake events from the engine package and shows the first caption.

import { fakeEvents } from "@git-visualizer/engine";

// The first fake event is the clone.
const firstEvent = fakeEvents[0];

export default function App() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-4 text-2xl font-semibold">Git Visualizer</h1>
      {/* The command that was typed, shown like a terminal line. */}
      <p className="mb-2 font-mono text-sm opacity-70">$ {firstEvent.command}</p>
      {/* aria-live: screen readers read the caption out loud when it changes. */}
      <p aria-live="polite" className="max-w-prose">
        {firstEvent.caption}
      </p>
    </main>
  );
}
