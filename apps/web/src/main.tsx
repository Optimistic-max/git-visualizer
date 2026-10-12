// main.tsx
// The starting point of the website. It finds the #root div in index.html
// and puts the App component inside it.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// "!" tells TypeScript we are sure the #root div exists (it is in index.html).
const rootElement = document.getElementById("root")!;

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
