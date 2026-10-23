/** Lowercases and strips accents so « Épinards » and « epinards » compare equal. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘`]/g, "'");
}

export function slugify(value: string): string {
  return (
    normalize(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "recette"
  );
}

/** Words that do not identify an ingredient when matching names in text. */
const STOP_WORDS = new Set([
  "a",
  "au",
  "aux",
  "d",
  "de",
  "des",
  "du",
  "en",
  "et",
  "l",
  "la",
  "le",
  "les",
  "ou",
  "un",
  "une",
]);

export interface Token {
  /** Comparable form: normalised and singular. */
  key: string;
  start: number;
  end: number;
}

/** Splits text into comparable word tokens, skipping articles and prepositions. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    const key = singularKey(normalize(match[0]));
    if (STOP_WORDS.has(key)) continue;
    tokens.push({
      key,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

function singularKey(word: string): string {
  if (word.length > 3 && /[sx]$/.test(word) && !word.endsWith("ss"))
    return word.slice(0, -1);
  return word;
}

const H_ASPIRE = /^(hachis|haddock|hareng|haricot|homard|houblon|hampe|hot)/i;

/** « d'ail », « d'huile » but « de riz », « de haricots ». */
export function withDe(name: string): string {
  return /^[aeiouyàâäéèêëîïôöùûüœæh]/i.test(name) && !H_ASPIRE.test(name)
    ? `d'${name}`
    : `de ${name}`;
}

const INVARIABLE = new Set([
  "anchois",
  "ananas",
  "bras",
  "cassis",
  "frais",
  "gras",
  "gros",
  "jus",
  "mais",
  "noix",
  "pois",
  "radis",
  "riz",
]);

function pluralizeWord(word: string): string {
  if (/[sxz]$/i.test(word)) return word;
  if (/(au|eu)$/i.test(word)) return `${word}x`;
  return `${word}s`;
}

function singularizeWord(word: string): string {
  if (INVARIABLE.has(normalize(word))) return word;
  if (/eaux$/i.test(word)) return word.slice(0, -1);
  if (word.length > 3 && /s$/i.test(word) && !/ss$/i.test(word))
    return word.slice(0, -1);
  return word;
}

/**
 * Agrees a countable ingredient name with its quantity: « 1 oignon jaune » →
 * « 2 oignons jaunes ». Only the words before a complement (« de », « à »…)
 * change, so « pomme de terre » becomes « pommes de terre ».
 */
export function agreeName(name: string, plural: boolean): string {
  const words = name.split(" ");
  const out: string[] = [];
  let inflect = true;
  for (const word of words) {
    if (
      /^(de|d'|du|des|à|au|aux|en|pour|sans|avec|,)/i.test(word) ||
      word.includes("'")
    ) {
      inflect = false;
    }
    if (inflect && /^[\p{L}-]+$/u.test(word)) {
      out.push(plural ? pluralizeWord(word) : singularizeWord(word));
    } else {
      out.push(word);
    }
  }
  return out.join(" ");
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
