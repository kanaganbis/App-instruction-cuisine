import { describe, expect, it } from "vitest";

import { parseIngredientLine } from "./ingredient-line";

describe("parseIngredientLine", () => {
  it.each([
    [
      "160 g de riz basmati complet",
      { min: 160 },
      "g",
      "riz basmati complet",
      null,
    ],
    ["2 gousses d'ail", { min: 2 }, "gousse", "ail", null],
    ["1 c. à soupe d'huile d'olive", { min: 1 }, "cs", "huile d'olive", null],
    ["2 cuillères à café de curry", { min: 2 }, "cc", "curry", null],
    ["1 cs de miel", { min: 1 }, "cs", "miel", null],
    ["½ citron vert", { min: 0.5 }, null, "citron vert", null],
    ["1/2 citron", { min: 0.5 }, null, "citron", null],
    ["1 ½ kg de tomates", { min: 1.5 }, "kg", "tomates", null],
    ["1,5 l de bouillon", { min: 1.5 }, "l", "bouillon", null],
    ["2 à 3 échalotes", { min: 2, max: 3 }, null, "échalotes", null],
    ["2-3 brins de thym", { min: 2, max: 3 }, "brin", "thym", null],
    ["1 oignon jaune, émincé", { min: 1 }, null, "oignon jaune", "émincé"],
    [
      "1 boîte (400 g) de pois chiches",
      { min: 1 },
      "boite",
      "pois chiches",
      "400 g",
    ],
    ["200 ml de crème (facultatif)", { min: 200 }, "ml", "crème", "facultatif"],
    ["3 œufs", { min: 3 }, null, "œufs", null],
    ["une pincée de sel", { min: 1 }, "pincee", "sel", null],
    ["Une gousse d'ail", { min: 1 }, "gousse", "ail", null],
    ["160g de farine", { min: 160 }, "g", "farine", null],
    ["- [ ] 50 g de beurre", { min: 50 }, "g", "beurre", null],
  ])("%s", (line, quantity, unitId, name, note) => {
    expect(parseIngredientLine(line)).toMatchObject({
      quantity,
      unitId,
      name,
      note,
    });
  });

  it("keeps lists without quantity as one ingredient", () => {
    expect(parseIngredientLine("Sel, poivre")).toMatchObject({
      quantity: null,
      unitId: null,
      name: "Sel, poivre",
      note: null,
    });
  });

  it("keeps vague amounts as a qualifier", () => {
    expect(parseIngredientLine("quelques brins de coriandre")).toMatchObject({
      quantity: null,
      qualifier: "quelques",
      unitId: "brin",
      name: "coriandre",
    });
  });

  it("does not read the start of a word as a unit", () => {
    expect(parseIngredientLine("1 laitue")).toMatchObject({
      unitId: null,
      name: "laitue",
    });
    expect(parseIngredientLine("2 gros oignons")).toMatchObject({
      unitId: null,
      name: "gros oignons",
    });
  });
});
