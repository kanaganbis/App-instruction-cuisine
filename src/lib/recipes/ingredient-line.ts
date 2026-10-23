import { readLeadingQuantity } from "./quantity";
import type { Quantity } from "./types";
import { matchUnit } from "./units";

export interface ParsedIngredientLine {
  quantity: Quantity | null;
  unitId: string | null;
  name: string;
  note: string | null;
  qualifier: string | null;
}

const DE_PATTERN = /^(?:de\s+|d['’]\s*|du\s+|des\s+)/i;

/**
 * Splits « 2 gousses d'ail, hachées » into quantity, unit, name and note.
 * Lines without a number (« Sel, poivre ») keep their whole text as name.
 */
export function parseIngredientLine(raw: string): ParsedIngredientLine {
  const line = raw
    .replace(/^\s*(?:[-*•–]\s+)?(?:\[[ xX]\]\s*)?/, "")
    .replace(/\s+/g, " ")
    .trim();

  const {
    quantity,
    qualifier,
    rest: afterQuantity,
  } = readLeadingQuantity(line);
  let rest = afterQuantity;
  let unitId: string | null = null;
  const notes: string[] = [];

  if (quantity || qualifier) {
    const unit = matchUnit(rest);
    if (unit) {
      unitId = unit.unitId;
      rest = unit.rest.trimStart();
    }
    // « 1 boîte (400 g) de pois chiches »
    const parenthesis = /^\(([^)]*)\)\s*/.exec(rest);
    if (parenthesis?.[1]) {
      notes.push(parenthesis[1].trim());
      rest = rest.slice(parenthesis[0].length);
    }
    rest = rest.replace(DE_PATTERN, "");
  }

  let name = rest;
  // Trailing « (facultatif) » or « (environ 400 g) ».
  const trailing = /\s*\(([^)]*)\)\s*$/.exec(name);
  if (trailing?.[1] !== undefined) {
    notes.push(trailing[1].trim());
    name = name.slice(0, trailing.index);
  }
  // « oignon jaune, émincé » or « oignon jaune – émincé ». Without a quantity
  // a comma usually lists items (« Sel, poivre »), so it is kept.
  const separator =
    quantity || qualifier ? /\s*(?:,|\s[–—-]\s)\s*/ : /\s[–—-]\s/;
  const split = separator.exec(name);
  if (split && split.index > 0) {
    notes.unshift(name.slice(split.index + split[0].length).trim());
    name = name.slice(0, split.index);
  }

  name = name.replace(/[.;:]+$/, "").trim();
  const note = notes.filter(Boolean).join(", ") || null;
  return { quantity, unitId, name: name || line, note, qualifier };
}
