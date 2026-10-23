import type { Quantity } from "./types";

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 1 / 2,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅛": 1 / 8,
};

export const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  quinze: 15,
  vingt: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
};

const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join("");

/** One number: « 2 », « 1,5 », « 1/2 », « 1 1/2 », « 1½ », « ½ ». */
const NUMBER = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?(?:\\s*[${FRACTION_CHARS}])?|[${FRACTION_CHARS}])`;
const WORD = `(?:${Object.keys(NUMBER_WORDS).join("|")})`;
const ONE = `(?:${NUMBER}|${WORD}(?![\\p{L}]))`;
const RANGE_SEPARATOR = `\\s*(?:à|-|–|ou)\\s*`;

const QUANTITY_PATTERN = new RegExp(
  `^(${ONE})(?:${RANGE_SEPARATOR}(${ONE}))?`,
  "iu",
);
const HALF_PATTERN = /^(?:une?\s+)?demie?(?:-|\s+)/i;
const QUALIFIER_PATTERN =
  /^(quelques|un peu|un soupçon|une goutte|un trait|plusieurs|un filet|une noisette|une pincée|une poignée)(?![\p{L}])/iu;

export function parseNumber(raw: string): number | null {
  const text = raw.trim().toLowerCase();
  if (text in NUMBER_WORDS) return NUMBER_WORDS[text] ?? null;
  const fraction = /^(\d+)\/(\d+)$/.exec(text);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator ? Number(fraction[1]) / denominator : null;
  }
  const mixed = /^(\d+(?:[.,]\d+)?)?\s*(?:([½⅓⅔¼¾⅛])|(\d+)\/(\d+))?$/u.exec(
    text,
  );
  if (!mixed) return null;
  const whole = mixed[1] ? Number(mixed[1].replace(",", ".")) : 0;
  let part = 0;
  if (mixed[2]) part = UNICODE_FRACTIONS[mixed[2]] ?? 0;
  else if (mixed[3] && mixed[4] && Number(mixed[4]))
    part = Number(mixed[3]) / Number(mixed[4]);
  if (!mixed[1] && !mixed[2] && !mixed[3]) return null;
  return whole + part;
}

export interface LeadingQuantity {
  quantity: Quantity | null;
  qualifier: string | null;
  rest: string;
}

/** Reads the quantity at the start of an ingredient line. */
export function readLeadingQuantity(text: string): LeadingQuantity {
  const half = HALF_PATTERN.exec(text);
  if (half) {
    return {
      quantity: { min: 0.5 },
      qualifier: null,
      rest: text.slice(half[0].length),
    };
  }

  const qualifier = QUALIFIER_PATTERN.exec(text);
  if (qualifier?.[1]) {
    const word = qualifier[1].toLowerCase();
    // « une pincée », « un filet » … are a unit with a quantity of one.
    if (/^(un|une) (filet|noisette|pincée|poignée)$/.test(word)) {
      return {
        quantity: { min: 1 },
        qualifier: null,
        rest: text.slice(word.indexOf(" ") + 1),
      };
    }
    return {
      quantity: null,
      qualifier: word,
      rest: text.slice(qualifier[0].length).trimStart(),
    };
  }

  const match = QUANTITY_PATTERN.exec(text);
  if (match?.[1]) {
    const min = parseNumber(match[1]);
    const max = match[2] ? parseNumber(match[2]) : null;
    if (min !== null) {
      const quantity: Quantity =
        max !== null && max > min ? { min, max } : { min };
      return {
        quantity,
        qualifier: null,
        rest: text.slice(match[0].length).trimStart(),
      };
    }
  }

  return { quantity: null, qualifier: null, rest: text };
}
