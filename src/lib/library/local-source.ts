import { SourceError, type RecipeSource, type RemoteFile } from "./source";

/**
 * Development only: the recipes of `./recettes` (or `RECETTES_DIR`), served by
 * the dev server (`scripts/vite-local-recipes.ts`). Lets you work on the app
 * without a Google Drive folder.
 */
export function createLocalSource(base = "/__recettes"): RecipeSource {
  async function get(url: string, signal?: AbortSignal): Promise<Response> {
    const response = await fetch(url, { signal });
    if (!response.ok)
      throw new SourceError(
        `Lecture du dossier local impossible (${response.status}).`,
      );
    return response;
  }

  return {
    id: "local",
    label: "Dossier local (développement)",
    async list(signal) {
      return (await (
        await get(`${base}/index.json`, signal)
      ).json()) as RemoteFile[];
    },
    async read(file, signal) {
      return (
        await get(`${base}/file?path=${encodeURIComponent(file.path)}`, signal)
      ).text();
    },
    imageUrl(file) {
      return `${base}/file?path=${encodeURIComponent(file.path)}`;
    },
  };
}
