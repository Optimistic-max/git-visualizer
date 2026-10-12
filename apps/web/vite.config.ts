// vite.config.ts
// Settings for Vite, the tool that runs the dev server and builds the site.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // react: understands JSX and reloads components instantly when you save.
  // tailwindcss: turns Tailwind class names (like "text-lg") into real CSS.
  plugins: [react(), tailwindcss()],
});
