import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import { ErrorBoundary } from "./components/error-boundary";

import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Élément #root introuvable");

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Lets phones open the app without network and show timer notifications.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
