import { readFileSync } from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";

const FOLDER = "application/vnd.google-apps.folder";
const recipe = (file: string) =>
  readFileSync(path.join(import.meta.dirname, "recettes", file), "utf8");

interface MockFile {
  id: string;
  name: string;
  mimeType: string;
  parent: string;
  content?: string;
}

/** The Drive folder the e2e build points to (see playwright.config.ts). */
export const FOLDER_ID = "dossier-e2e";

const FILES: MockFile[] = [
  {
    id: "curry",
    name: "curry-pois-chiches-patate-douce.md",
    mimeType: "text/markdown",
    parent: FOLDER_ID,
    content: recipe("curry-pois-chiches-patate-douce.md"),
  },
  { id: "poissons", name: "poissons", mimeType: FOLDER, parent: FOLDER_ID },
  {
    id: "saumon",
    name: "saumon-quinoa-brocoli.md",
    mimeType: "text/markdown",
    parent: "poissons",
    content: recipe("saumon-quinoa-brocoli.md"),
  },
];

const cors = { "Access-Control-Allow-Origin": "*" };

/**
 * Answers the Google Drive API calls of the app like a folder shared by link.
 * `mode: "offline"` cuts the network, `"missing"` acts as if the folder were private.
 */
export async function mockDrive(
  page: Page,
  mode: "online" | "offline" | "missing" = "online",
) {
  await page.unroute("https://www.googleapis.com/**");
  await page.route("https://www.googleapis.com/**", async (route) => {
    if (mode === "offline") return route.abort("internetdisconnected");
    const url = new URL(route.request().url());
    const id = /\/drive\/v3\/files\/([^/?]+)/.exec(url.pathname)?.[1];

    if (
      mode === "missing" ||
      (id && id !== FOLDER_ID && !FILES.some((file) => file.id === id))
    ) {
      return route.fulfill({
        status: 404,
        headers: cors,
        json: { error: { code: 404, message: "File not found." } },
      });
    }
    if (!id) {
      const parent = /'([^']+)' in parents/.exec(
        url.searchParams.get("q") ?? "",
      )?.[1];
      const files = FILES.filter((file) => file.parent === parent).map(
        ({ id, name, mimeType }) => ({
          id,
          name,
          mimeType,
          modifiedTime: "2026-10-01T10:00:00.000Z",
        }),
      );
      return route.fulfill({ headers: cors, json: { files } });
    }
    if (id === FOLDER_ID)
      return route.fulfill({ headers: cors, json: { id, mimeType: FOLDER } });
    const file = FILES.find((item) => item.id === id);
    return route.fulfill({
      headers: { ...cors, "Content-Type": "text/markdown" },
      body: file?.content ?? "",
    });
  });
}
