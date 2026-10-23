/**
 * Vérifie que des fichiers recette sont bien compris par l'application.
 *
 *   npm run recettes:verifier                 # tout le dossier des recettes
 *   npm run recettes:verifier -- ma-recette.md
 *
 * Affiche, pour chaque fichier, ce que l'application en retient et les
 * remarques éventuelles. Code de sortie 1 s'il y a des remarques.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { formatDuration } from "../src/lib/recipes/duration";
import { parseRecipe } from "../src/lib/recipes/parse-recipe";

function markdownFiles(target: string): string[] {
  if (statSync(target).isFile()) return [target];
  return readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) return [];
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return /\.md$/i.test(entry.name) && !/^readme\.md$/i.test(entry.name)
      ? [full]
      : [];
  });
}

const targets = process.argv.slice(2);
const files = (
  targets.length ? targets : [process.env.RECETTES_DIR || "recettes"]
).flatMap(markdownFiles);

let problems = 0;
for (const file of files) {
  const recipe = parseRecipe(readFileSync(file, "utf8"), {
    slug: "verification",
    file,
  });
  const timers = recipe.steps.filter((step) => step.timer).length;
  const withQuantities = recipe.steps.filter((step) =>
    step.paragraphs
      .flat()
      .some((node) => node.type === "ingredient" && node.mode === "explicit"),
  ).length;

  console.log(`\n${recipe.warnings.length ? "⚠" : "✓"} ${file}`);
  console.log(`  ${recipe.title}`);
  const meta = recipe.meta;
  console.log(
    `  ${meta.servings ?? "?"} portions · préparation ${meta.prepMinutes ?? "?"} min · cuisson ${meta.cookMinutes ?? "?"} min`,
  );
  console.log(
    `  ${recipe.ingredients.length} ingrédients · ${recipe.steps.length} étapes · ${withQuantities} avec quantités dans le texte · ${timers} minuteurs`,
  );
  for (const step of recipe.steps) {
    const timer = step.timer ? ` ⏱ ${formatDuration(step.timer.seconds)}` : "";
    console.log(
      `    ${step.index + 1}. ${step.title ?? "(sans titre)"} — ${step.ingredientIds.length} ingr.${timer}`,
    );
  }
  for (const warning of recipe.warnings) console.log(`  → ${warning}`);
  problems += recipe.warnings.length;
}

console.log(`\n${files.length} fichier(s), ${problems} remarque(s).`);
process.exitCode = problems ? 1 : 0;
