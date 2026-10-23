import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { plainText } from "./inline";
import { parseRecipe } from "./parse-recipe";
import type { Recipe, Step } from "./types";

function sample(file: string): Recipe {
  const source = readFileSync(
    path.join(process.cwd(), "recettes", file),
    "utf8",
  );
  return parseRecipe(source, { slug: "test", file });
}

function parse(markdown: string): Recipe {
  return parseRecipe(markdown, { slug: "test", file: "test.md" });
}

/** Step text as displayed, ingredient references replaced by their phrase. */
function render(recipe: Recipe, step: Step): string {
  const ingredients = new Map(
    recipe.ingredients.map((item) => [item.id, item]),
  );
  return step.paragraphs
    .map((paragraph) => plainText(paragraph, ingredients))
    .join("\n");
}

describe("parseRecipe — full format", () => {
  const recipe = sample("curry-pois-chiches-patate-douce.md");

  it("reads the front matter", () => {
    expect(recipe.title).toBe("Curry de pois chiches, patate douce & épinards");
    expect(recipe.meta).toMatchObject({
      servings: 4,
      prepMinutes: 15,
      cookMinutes: 30,
      totalMinutes: 45,
      category: "Plat complet",
      tags: ["végétarien", "sans gluten"],
    });
    expect(recipe.description).toMatch(/^Un curry doux/);
    expect(recipe.warnings).toEqual([]);
  });

  it("reads grouped ingredients", () => {
    expect(recipe.ingredients).toHaveLength(15);
    expect(recipe.ingredientGroups.map((group) => group.name)).toEqual([
      "Légumes & herbes",
      "Épicerie",
      "Épices",
    ]);
    expect(
      recipe.ingredients.find((item) => item.id === "pois-chiches-cuits"),
    ).toMatchObject({
      quantity: { min: 400 },
      unitId: "g",
      note: "égouttés",
    });
  });

  it("reads titled steps, timers and tips", () => {
    expect(recipe.steps.map((step) => step.title)).toEqual([
      "Lancer le riz",
      "Tailler les légumes",
      "Faire revenir",
      "Réveiller les épices",
      "Laisser mijoter",
      "Pois chiches & épinards",
      "Assaisonner & servir",
    ]);
    const [first, , third, fourth, fifth] = recipe.steps;
    expect(first?.timer).toEqual({ seconds: 1500, source: "explicit" });
    expect(first?.tips).toHaveLength(1);
    expect(third?.timer).toEqual({ seconds: 240, source: "explicit" });
    expect(fourth?.timer).toEqual({ seconds: 30, source: "detected" });
    expect(fifth?.timer).toEqual({ seconds: 900, source: "detected" });
  });

  it("puts quantities in the step text", () => {
    const [first, second, third] = recipe.steps as [Step, Step, Step];
    expect(render(recipe, first)).toBe(
      "Rincez 160 g de riz basmati complet à l'eau froide, puis faites-le cuire dans 2,5 fois son volume d'eau bouillante salée, à couvert et à feu doux.",
    );
    expect(render(recipe, second)).toBe(
      "Émincez 1 oignon jaune, hachez 2 gousses d'ail et râpez 20 g de gingembre frais. Épluchez 500 g de patate douce et coupez-la en cubes de 2 cm.",
    );
    expect(third.ingredientIds).toEqual([
      "oignon-jaune",
      "ail",
      "gingembre-frais",
      "huile-d-olive",
    ]);
  });

  it("does not take the dish name or tips for an ingredient", () => {
    // « curry » is the dish in « … au-dessus du curry » and in the first tip.
    expect(recipe.steps[0]?.ingredientIds).toEqual(["riz-basmati-complet"]);
    expect(recipe.steps[6]?.ingredientIds).toEqual([
      "citron-vert",
      "coriandre-fraiche",
      "riz-basmati-complet",
      "sel-poivre",
    ]);
  });

  it("keeps other sections as notes", () => {
    expect(recipe.notes.map((note) => note.title)).toEqual([
      "Pourquoi c'est équilibré",
      "Conservation",
    ]);
    expect(recipe.notes[0]?.markdown).toContain("**Légumes**");
  });
});

describe("parseRecipe — light formats", () => {
  it("reads metadata lines and numbered steps with bold titles", () => {
    const recipe = sample("saumon-quinoa-brocoli.md");
    expect(recipe.meta).toMatchObject({
      servings: 2,
      prepMinutes: 10,
      cookMinutes: 20,
    });
    expect(recipe.description).toMatch(/^Une assiette simple/);
    expect(recipe.steps.map((step) => step.title)).toEqual([
      "Préchauffer le four",
      "Cuire le quinoa",
      "Préparer le brocoli",
      "Rôtir le saumon",
      "Dresser",
    ]);
    expect(render(recipe, recipe.steps[0] as Step)).toBe(
      "Réglez le four à 200 °C.",
    );
    const roast = recipe.steps[3];
    expect(roast?.timer).toEqual({ seconds: 720, source: "detected" });
    expect(roast?.ingredientIds).toEqual([
      "saumon",
      "citron",
      "huile-d-olive",
      "sel-poivre",
    ]);
    expect(recipe.warnings).toEqual([]);
  });

  it("reads untitled numbered steps and recognises ingredients in the text", () => {
    const recipe = sample("petit-dejeuner/porridge-avoine-fruits-rouges.md");
    expect(recipe.meta).toMatchObject({
      servings: 1,
      cookMinutes: 5,
      tags: ["petit-déjeuner", "végétarien"],
    });
    expect(recipe.steps).toHaveLength(3);
    expect(recipe.steps[0]?.title).toBeNull();
    expect(recipe.steps[0]?.ingredientIds).toEqual([
      "flocons-d-avoine",
      "lait-demi-ecreme",
    ]);
    expect(recipe.steps[2]?.ingredientIds).toEqual([
      "fruits-rouges",
      "amandes-effilees",
    ]);
  });

  it("works without any heading", () => {
    const recipe = parse(`Pour 2 personnes

- 2 œufs
- 1 noix de beurre

1. Battez les œufs.
2. Faites fondre le beurre et cuisez 3 min.`);
    expect(recipe.meta.servings).toBe(2);
    expect(recipe.ingredients.map((item) => item.name)).toEqual([
      "œufs",
      "beurre",
    ]);
    expect(recipe.steps).toHaveLength(2);
    expect(recipe.steps[1]?.timer?.seconds).toBe(180);
  });

  it("reads groups written as bold labels and « Pour … : » items", () => {
    const recipe = parse(`# Tarte
## Ingrédients
**Pâte**
- 200 g de farine
- Pour la garniture :
- 3 pommes
## Étapes
Mélangez la farine. Coupez les pommes.`);
    expect(recipe.ingredients.map((item) => [item.name, item.group])).toEqual([
      ["farine", "Pâte"],
      ["pommes", "Pour la garniture"],
    ]);
    expect(recipe.steps[0]?.ingredientIds).toEqual(["farine", "pommes"]);
  });

  it("reports references that match no ingredient", () => {
    const recipe = parse(`# Test
## Ingrédients
- 1 pomme
## Étapes
Coupez {poire}.`);
    expect(recipe.warnings).toEqual([
      "Étape 1 : « {poire} » ne correspond à aucun ingrédient de la liste.",
    ]);
  });

  it("reports missing sections and broken front matter", () => {
    const recipe = parse(`---
titre: [oups
---
Juste du texte.`);
    expect(recipe.warnings).toHaveLength(3);
    expect(recipe.warnings[0]).toMatch(/En-tête YAML illisible/);
  });
});
