import { formatIngredient } from "./format";
import type { Ingredient, Inline, Step } from "./types";

/** Step text as plain words, references replaced by their quantity. */
export function plainText(
  nodes: Inline[],
  ingredients: Map<string, Ingredient>,
  factor = 1,
): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "code":
          return node.value;
        case "strong":
        case "emphasis":
          return plainText(node.children, ingredients, factor);
        case "duration":
          return node.text;
        case "ingredient": {
          const ingredient = ingredients.get(node.ingredientId);
          return node.mode === "explicit" && ingredient
            ? formatIngredient(ingredient, factor).phrase
            : node.text;
        }
      }
    })
    .join("");
}

/** A short name for a step: its title, or the first words of its text. */
export function stepLabel(
  step: Step,
  ingredients: Map<string, Ingredient>,
): string {
  if (step.title) return step.title;
  const words = plainText(step.paragraphs[0] ?? [], ingredients)
    .trim()
    .split(/\s+/);
  if (!words[0]) return `Étape ${step.index + 1}`;
  const short = words
    .slice(0, 6)
    .join(" ")
    .replace(/[,;:.]+$/, "");
  return words.length > 6 ? `${short}…` : short;
}
