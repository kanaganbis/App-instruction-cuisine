import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import type { Plugin } from "vite";

const IMAGE = /\.(avif|gif|jpe?g|png|webp)$/i;
const TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function walk(
  dir: string,
  base: string,
): { id: string; path: string; kind: string; version: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, base);
    const relative = path.relative(base, full).split(path.sep).join("/");
    const kind = /\.md$/i.test(entry.name)
      ? "markdown"
      : IMAGE.test(entry.name)
        ? "image"
        : null;
    if (!kind || /^readme\.md$/i.test(entry.name)) return [];
    return [
      {
        id: relative,
        path: relative,
        kind,
        version: String(statSync(full).mtimeMs),
      },
    ];
  });
}

/**
 * Development helper: serves the local recipes folder (`RECETTES_DIR`, by
 * default ./recettes) so the app can run without Google Drive.
 */
export function localRecipes(): Plugin {
  return {
    name: "cuisine-local-recipes",
    apply: "serve",
    configureServer(server) {
      const dir = path.resolve(process.env.RECETTES_DIR || "recettes");
      server.middlewares.use("/__recettes", (request, response) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        try {
          if (url.pathname === "/index.json") {
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(walk(dir, dir)));
            return;
          }
          const file = path.resolve(dir, url.searchParams.get("path") ?? "");
          if (
            url.pathname !== "/file" ||
            path.relative(dir, file).startsWith("..")
          ) {
            response.statusCode = 404;
            response.end();
            return;
          }
          response.setHeader(
            "Content-Type",
            TYPES[path.extname(file).toLowerCase()] ??
              "text/markdown; charset=utf-8",
          );
          response.end(readFileSync(file));
        } catch {
          response.statusCode = 404;
          response.end();
        }
      });
    },
  };
}
