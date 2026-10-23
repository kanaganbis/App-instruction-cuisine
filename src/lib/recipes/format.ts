import { agreeName, withDe } from "./text";
import type { Ingredient, Quantity } from "./types";
import { getUnit, type UnitDef } from "./units";

const FRACTIONS: [number, string][] = [
  [0, ""],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [1, ""],
];

const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** « 1½ », « ¾ », « 3 » — for spoons and countable items. */
export function formatFraction(value: number): string {
  if (value >= 10) return String(Math.round(value));
  const whole = Math.floor(value);
  const rest = value - whole;
  let best = FRACTIONS[0] as [number, string];
  for (const candidate of FRACTIONS) {
    if (Math.abs(candidate[0] - rest) <= Math.abs(best[0] - rest))
      best = candidate;
  }
  const units = best[0] === 1 ? whole + 1 : whole;
  if (!units && !best[1]) return decimal.format(value);
  return `${units || ""}${best[1]}` || "0";
}

/** Rounds a scaled weight or volume to a value one would actually measure. */
function roundMeasure(value: number): number {
  if (value < 10) return Math.round(value * 2) / 2;
  if (value < 100) return Math.round(value / 5) * 5;
  if (value < 1000) return Math.round(value / 10) * 10;
  return Math.round(value / 50) * 50;
}

interface DisplayAmount {
  value: string;
  unit: UnitDef | null;
  /** Used for plural agreement. */
  amount: number;
}

function displayAmount(
  value: number,
  unit: UnitDef | null,
  scaled: boolean,
): DisplayAmount {
  if (!unit)
    return {
      value: scaled ? formatFraction(value) : formatExact(value),
      unit,
      amount: value,
    };
  if ((unit.kind === "mass" || unit.kind === "volume") && unit.base) {
    let base = value * unit.base;
    if (scaled) base = roundMeasure(base);
    const [targetId, factor] =
      unit.kind === "mass"
        ? base >= 1000
          ? ["kg", 1000]
          : base < 1 && unit.id === "mg"
            ? ["mg", 0.001]
            : ["g", 1]
        : base >= 1000
          ? ["l", 1000]
          : unit.id === "cl" || unit.id === "dl"
            ? [unit.id, unit.base]
            : ["ml", 1];
    const target = getUnit(targetId);
    const converted = base / factor;
    const keepOriginal = !scaled && target.id !== unit.id;
    return keepOriginal
      ? { value: formatExact(value), unit, amount: value }
      : {
          value: decimal.format(Math.round(converted * 100) / 100),
          unit: target,
          amount: converted,
        };
  }
  return {
    value: scaled ? formatFraction(value) : formatExact(value),
    unit,
    amount: value,
  };
}

function formatExact(value: number): string {
  return Number.isInteger(value) ? String(value) : formatFraction(value);
}

export interface FormattedIngredient {
  /** « 2 gousses », « 1 c. à s. », « au goût ». */
  amount: string;
  /** « ail », « oignons jaunes ». */
  name: string;
  /** What follows the amount in a sentence: « d'ail », « oignons jaunes ». */
  tail: string;
  /** Full phrase used inside step text: « 2 gousses d'ail ». */
  phrase: string;
}

function rangeText(
  quantity: Quantity,
  factor: number,
  unit: UnitDef | null,
  scaled: boolean,
) {
  const min = displayAmount(quantity.min * factor, unit, scaled);
  if (quantity.max === undefined) return min;
  const max = displayAmount(quantity.max * factor, unit, scaled);
  return { ...max, value: `${min.value} à ${max.value}` };
}

/** Formats an ingredient for `factor` = wanted servings ÷ recipe servings. */
export function formatIngredient(
  ingredient: Ingredient,
  factor = 1,
): FormattedIngredient {
  const unit = ingredient.unitId ? getUnit(ingredient.unitId) : null;
  if (!ingredient.quantity) {
    const qualifier = ingredient.qualifier;
    if (qualifier) {
      const unitWord = unit ? ` ${unit.plural}` : "";
      const phrase = unit
        ? `${qualifier}${unitWord} ${withDe(ingredient.name)}`
        : `${qualifier} ${withDe(ingredient.name)}`;
      return {
        amount: `${qualifier}${unitWord}`,
        name: ingredient.name,
        tail: withDe(ingredient.name),
        phrase,
      };
    }
    return {
      amount: "",
      name: ingredient.name,
      tail: ingredient.name,
      phrase: ingredient.name,
    };
  }

  const scaled = Math.abs(factor - 1) > 1e-9;
  const display = rangeText(ingredient.quantity, factor, unit, scaled);
  const plural = display.amount >= 2;
  const originalPlural =
    (ingredient.quantity.max ?? ingredient.quantity.min) >= 2;

  if (display.unit) {
    const word = plural ? display.unit.plural : display.unit.singular;
    const short = display.unit.short ?? word;
    return {
      amount: `${display.value} ${short}`,
      name: ingredient.name,
      tail: withDe(ingredient.name),
      phrase: `${display.value} ${word} ${withDe(ingredient.name)}`,
    };
  }

  const name =
    plural === originalPlural
      ? ingredient.name
      : agreeName(ingredient.name, plural);
  return {
    amount: display.value,
    name,
    tail: name,
    phrase: `${display.value} ${name}`,
  };
}
