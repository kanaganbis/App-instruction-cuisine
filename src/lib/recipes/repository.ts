import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { parseRecipe } from "./parse-recipe";
import { capitalize, slugify } from "./text";
import type { Recipe, RecipeSummary } from "./types";

const IGNORED_FILES = /^(readme|lisezmoi|license|licence|changelog)\.md$/i;
const IMAGE_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Folder holding the recipes: `RECETTES_DIR`, or `./recettes` by default. */
export function getRecipesDir(): string {
  const configured = process.env.RECETTES_DIR?.trim();
  // The folder is chosen at run time, so it must not be traced into the build.
  return path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    configured || "recettes",
  );
}

export interface RecipeFileError {
  file: string;
  message: string;
}

export interface Library {
  dir: string;
  dirExists: boolean;
  recipes: RecipeSummary[];
  errors: RecipeFileError[];
}

interface Entry {
  absolute: string;
  relative: string;
  slug: string;
  mtimeMs: number;
}

/** Parsed recipes, reused while the file is unchanged. */
const cache = new Map<string, { mtimeMs: number; recipe: Recipe }>();

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith(".") || entry.name.startsWith("_")) return [];
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "node_modules" ? [] : listMarkdownFiles(absolute);
      }
      if (
        !entry.isFile() ||
        !/\.md$/i.test(entry.name) ||
        IGNORED_FILES.test(entry.name)
      )
        return [];
      return [absolute];
    }),
  );
  return files.flat();
}

async function scan(
  dir: string,
): Promise<{ entries: Entry[]; dirExists: boolean }> {
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) return { entries: [], dirExists: false };
  } catch {
    return { entries: [], dirExists: false };
  }

  const files = (await listMarkdownFiles(dir)).sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
  const used = new Set<string>();
  const entries = await Promise.all(
    files.map(async (absolute) => {
      const relative = path.relative(dir, absolute).split(path.sep).join("/");
      const info = await stat(absolute);
      return { absolute, relative, mtimeMs: info.mtimeMs };
    }),
  );
  return {
    dirExists: true,
    entries: entries.map((entry) => {
      // The slug comes from the path so it stays stable (saved progress uses it).
      const base = slugify(entry.relative.replace(/\.md$/i, ""));
      let slug = base;
      for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
      used.add(slug);
      return { ...entry, slug };
    }),
  };
}

async function load(entry: Entry): Promise<Recipe> {
  const cached = cache.get(entry.absolute);
  if (
    cached &&
    cached.mtimeMs === entry.mtimeMs &&
    cached.recipe.slug === entry.slug
  ) {
    return cached.recipe;
  }
  const source = await readFile(entry.absolute, "utf8");
  const recipe = parseRecipe(source, {
    slug: entry.slug,
    file: entry.relative,
  });
  recipe.meta.category ??= folderCategory(entry.relative, recipe.meta.tags);
  cache.set(entry.absolute, { mtimeMs: entry.mtimeMs, recipe });
  return recipe;
}

/**
 * « desserts/tarte.md » → « Desserts ». A tag with the same letters gives the
 * accents a folder name cannot have (« petit-dejeuner » → « Petit-déjeuner »).
 */
function folderCategory(relative: string, tags: string[]): string | null {
  const folder = relative.split("/").slice(0, -1).pop();
  if (!folder) return null;
  const tag = tags.find((item) => slugify(item) === slugify(folder));
  return capitalize(tag ?? folder.replace(/[-_]+/g, " ").trim()) || null;
}

export function imageUrl(recipe: Recipe): string | null {
  const image = recipe.meta.image;
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `/api/images/${recipe.slug}`;
}

function summarize(recipe: Recipe, mtimeMs: number): RecipeSummary {
  return {
    slug: recipe.slug,
    file: recipe.file,
    title: recipe.title,
    description: recipe.description,
    meta: recipe.meta,
    imageUrl: imageUrl(recipe),
    ingredientNames: recipe.ingredients.map((ingredient) => ingredient.name),
    stepCount: recipe.steps.length,
    updatedAt: mtimeMs,
    warningCount: recipe.warnings.length,
  };
}

/** Reads every recipe of the folder. Unreadable files are reported, not thrown. */
export async function getLibrary(): Promise<Library> {
  const dir = getRecipesDir();
  const { entries, dirExists } = await scan(dir);
  const recipes: RecipeSummary[] = [];
  const errors: RecipeFileError[] = [];
  await Promise.all(
    entries.map(async (entry) => {
      try {
        recipes.push(summarize(await load(entry), entry.mtimeMs));
      } catch (error) {
        errors.push({
          file: entry.relative,
          message:
            error instanceof Error ? error.message : "Lecture impossible",
        });
      }
    }),
  );
  recipes.sort((a, b) =>
    a.title.localeCompare(b.title, "fr", { sensitivity: "base" }),
  );
  return { dir, dirExists, recipes, errors };
}

export async function getRecipe(slug: string): Promise<Recipe | null> {
  const { entries } = await scan(getRecipesDir());
  const entry = entries.find((item) => item.slug === slug);
  return entry ? load(entry) : null;
}

/**
 * Locates the image of a recipe. Only files inside the recipes folder with an
 * image extension are served.
 */
export async function getRecipeImage(
  slug: string,
): Promise<{ file: string; contentType: string } | null> {
  const dir = getRecipesDir();
  const { entries } = await scan(dir);
  const entry = entries.find((item) => item.slug === slug);
  if (!entry) return null;
  const recipe = await load(entry);
  const image = recipe.meta.image;
  if (!image || /^[a-z]+:/i.test(image)) return null;

  try {
    const file = path.resolve(path.dirname(entry.absolute), decodeURI(image));
    const contentType = IMAGE_TYPES[path.extname(file).toLowerCase()];
    const inside = path.relative(dir, file);
    if (!contentType || inside.startsWith("..") || path.isAbsolute(inside))
      return null;
    if (!(await stat(file)).isFile()) return null;
    return { file, contentType };
  } catch {
    return null;
  }
}
