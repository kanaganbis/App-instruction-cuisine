import { parseRecipe } from "@/lib/recipes/parse-recipe";
import { capitalize, normalize, slugify } from "@/lib/recipes/text";
import type { Recipe, RecipeSummary } from "@/lib/recipes/types";

import type { RecipeSource, RemoteFile } from "./source";
import type { Snapshot } from "./sync";

export interface LibraryEntry {
  recipe: Recipe;
  summary: RecipeSummary;
}

/**
 * « desserts/tarte.md » → « Desserts ». A tag with the same letters gives the
 * accents a folder name may lack (« petit-dejeuner » → « Petit-déjeuner »).
 */
function folderCategory(path: string, tags: string[]): string | null {
  const folder = path.split("/").slice(0, -1).pop();
  if (!folder) return null;
  const tag = tags.find((item) => slugify(item) === slugify(folder));
  return capitalize(tag ?? folder.replace(/[-_]+/g, " ").trim()) || null;
}

/** « photos/curry.jpg » next to « plats/curry.md » → « plats/photos/curry.jpg ». */
function resolvePath(from: string, target: string): string {
  const parts = from.split("/").slice(0, -1);
  for (const part of target.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}

function imageUrl(
  recipe: Recipe,
  images: RemoteFile[],
  source: RecipeSource | null,
): string | null {
  const image = recipe.meta.image;
  if (!image) return null;
  if (/^https:\/\//i.test(image)) return image;
  if (!source) return null;
  let target: string;
  try {
    target = normalize(resolvePath(recipe.file, decodeURI(image)));
  } catch {
    return null;
  }
  const file = images.find((item) => normalize(item.path) === target);
  return file ? source.imageUrl(file) : null;
}

/** Parses the cached files into the recipes shown by the app. */
export function buildLibrary(
  snapshot: Snapshot,
  source: RecipeSource | null,
): LibraryEntry[] {
  const used = new Set<string>();
  return [...snapshot.recipes]
    .sort((a, b) => a.path.localeCompare(b.path, "fr"))
    .map((file) => {
      // The slug comes from the path so it stays stable: saved progress uses it.
      const base = slugify(file.path.replace(/\.md$/i, ""));
      let slug = base;
      for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
      used.add(slug);

      const recipe = parseRecipe(file.text, { slug, file: file.path });
      recipe.meta.category ??= folderCategory(file.path, recipe.meta.tags);
      const summary: RecipeSummary = {
        slug,
        file: file.path,
        title: recipe.title,
        description: recipe.description,
        meta: recipe.meta,
        imageUrl: imageUrl(recipe, snapshot.images, source),
        ingredientNames: recipe.ingredients.map(
          (ingredient) => ingredient.name,
        ),
        stepCount: recipe.steps.length,
        warningCount: recipe.warnings.length,
      };
      return { recipe, summary };
    })
    .sort((a, b) =>
      a.recipe.title.localeCompare(b.recipe.title, "fr", {
        sensitivity: "base",
      }),
    );
}
