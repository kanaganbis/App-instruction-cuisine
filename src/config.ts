import { createDriveSource } from "@/lib/library/drive";
import { parseDriveFolder } from "@/lib/library/drive-folder";
import { createLocalSource } from "@/lib/library/local-source";
import type { RecipeSource } from "@/lib/library/source";

/**
 * Where the recipes are read from, chosen when the app is built:
 * - `VITE_GOOGLE_API_KEY` + `VITE_DRIVE_FOLDER` (share link of the folder) → Google Drive;
 * - otherwise, in development (`npm run dev`), the local `recettes/` folder;
 * - otherwise nothing: the app explains how to configure it.
 */
export function createRecipeSource(
  env: ImportMetaEnv = import.meta.env,
): RecipeSource | null {
  const apiKey = env.VITE_GOOGLE_API_KEY?.trim();
  const folder = parseDriveFolder(env.VITE_DRIVE_FOLDER);
  if (apiKey && folder) return createDriveSource({ apiKey, folder });
  if (env.DEV) return createLocalSource();
  return null;
}
