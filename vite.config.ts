import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

import { localRecipes } from "./scripts/vite-local-recipes.ts";

export default defineConfig({
  // Relative paths: the page works from any address (GitHub Pages sub-folder…).
  base: "./",
  resolve: { tsconfigPaths: true },
  plugins: [
    react(),
    tailwindcss(),
    // Everything (code, styles, fonts) goes inside dist/index.html.
    viteSingleFile(),
    // Development only: serves ./recettes when no Google Drive folder is set.
    localRecipes(),
  ],
  server: { host: true },
  preview: { host: true },
});
