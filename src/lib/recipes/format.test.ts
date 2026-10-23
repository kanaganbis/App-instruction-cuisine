import { describe, expect, it } from "vitest";

import { formatFraction, formatIngredient } from "./format";
import { parseIngredientLine } from "./ingredient-line";
import type { Ingredient } from "./types";

function ingredient(line: string): Ingredient {
  return { id: "x", line, group: null, ...parseIngredientLine(line) };
}

const phrase = (line: string, factor = 1) =>
  formatIngredient(ingredient(line), factor).phrase;

describe("formatFraction", () => {
  it.each([
    [0.5, "½"],
    [0.25, "¼"],
    [0.75, "¾"],
    [1, "1"],
    [1.5, "1½"],
    [2.33, "2⅓"],
    [0.98, "1"],
    [12.4, "12"],
  ])("%s → %s", (value, expected) => {
    expect(formatFraction(value)).toBe(expected);
  });
});

describe("formatIngredient", () => {
  it("writes the phrase used in step text", () => {
    expect(phrase("160 g de riz basmati complet")).toBe(
      "160 g de riz basmati complet",
    );
    expect(phrase("2 gousses d'ail")).toBe("2 gousses d'ail");
    expect(phrase("1 c. à soupe d'huile d'olive")).toBe(
      "1 c. à soupe d'huile d'olive",
    );
    expect(phrase("1 oignon jaune")).toBe("1 oignon jaune");
    expect(phrase("Sel, poivre")).toBe("Sel, poivre");
  });

  it("uses short units in lists", () => {
    expect(
      formatIngredient(ingredient("1 c. à soupe d'huile d'olive")),
    ).toMatchObject({
      amount: "1 c. à s.",
      name: "huile d'olive",
    });
  });

  it("scales and agrees in number", () => {
    expect(phrase("2 gousses d'ail", 0.5)).toBe("1 gousse d'ail");
    expect(phrase("1 oignon jaune", 2)).toBe("2 oignons jaunes");
    expect(phrase("3 œufs", 1 / 3)).toBe("1 œuf");
    expect(phrase("1 c. à soupe d'huile d'olive", 0.5)).toBe(
      "½ c. à soupe d'huile d'olive",
    );
    expect(phrase("½ citron vert", 1.5)).toBe("¾ citron vert");
    expect(phrase("2 à 3 échalotes", 2)).toBe("4 à 6 échalotes");
  });

  it("rounds and converts weights and volumes", () => {
    expect(phrase("250 g de farine", 0.5)).toBe("130 g de farine");
    expect(phrase("500 g de patate douce", 3)).toBe("1,5 kg de patate douce");
    expect(phrase("1 l de lait", 0.25)).toBe("250 ml de lait");
    expect(phrase("20 cl de crème", 0.5)).toBe("10 cl de crème");
    expect(phrase("1000 g de pommes")).toBe("1000 g de pommes");
  });

  it("keeps vague amounts", () => {
    expect(phrase("quelques brins de coriandre", 2)).toBe(
      "quelques brins de coriandre",
    );
  });
});
