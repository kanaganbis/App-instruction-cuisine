import { tokenize, type Token } from "./text";
import type { Ingredient } from "./types";

/** Head words that say how an ingredient is cut or packed, not what it is. */
const GENERIC_HEADS = new Set([
  "botte",
  "branche",
  "brin",
  "feuille",
  "filet",
  "gousse",
  "jus",
  "morceau",
  "pincee",
  "poudre",
  "tranche",
  "zeste",
]);

/** Verbs that stand for an ingredient: « salez » uses the salt. */
const VERB_ALIASES: Record<string, string[]> = {
  sel: ["salez", "saler"],
  poivre: ["poivrez", "poivrer"],
};

interface Term {
  keys: string[];
  ingredientId: string;
}

export interface MentionMatch {
  start: number;
  end: number;
  ingredientId: string;
}

/**
 * Finds ingredient names inside step text so a step lists what it uses even
 * when the recipe does not reference ingredients explicitly. Longer names win
 * (« lait de coco » over « lait »); a short name shared by two ingredients is
 * ambiguous and ignored.
 */
export class MentionMatcher {
  private readonly terms: Term[];
  private readonly fullNames: Term[];

  /**
   * `titleWords`: words of the recipe title. A single word also found there
   * names the dish rather than the ingredient (« curry » in « Curry de pois
   * chiches » is not the « curry en poudre »), so it needs the full name.
   */
  constructor(ingredients: Ingredient[], titleWords: string[] = []) {
    const inTitle = new Set(
      tokenize(titleWords.join(" ")).map((token) => token.key),
    );
    this.fullNames = ingredients.map((ingredient) => ({
      keys: tokenize(ingredient.name).map((token) => token.key),
      ingredientId: ingredient.id,
    }));
    const candidates: Term[] = [];
    for (const ingredient of ingredients) {
      for (const alternative of ingredient.name.split(
        /\s*(?:,|\bet\b|\/|&)\s*/i,
      )) {
        const keys = tokenize(alternative).map((token) => token.key);
        for (const verb of keys.length === 1
          ? (VERB_ALIASES[keys[0] ?? ""] ?? [])
          : []) {
          candidates.push({ keys: [verb], ingredientId: ingredient.id });
        }
        for (let length = keys.length; length >= 1; length--) {
          const prefix = keys.slice(0, length);
          if (
            length === 1 &&
            keys.length > 1 &&
            GENERIC_HEADS.has(prefix[0] ?? "")
          )
            continue;
          if (length === 1 && (prefix[0]?.length ?? 0) < 3) continue;
          if (length === 1 && keys.length > 1 && inTitle.has(prefix[0] ?? ""))
            continue;
          candidates.push({ keys: prefix, ingredientId: ingredient.id });
        }
      }
    }

    const owners = new Map<string, Set<string>>();
    for (const term of candidates) {
      const key = term.keys.join(" ");
      if (!owners.has(key)) owners.set(key, new Set());
      owners.get(key)?.add(term.ingredientId);
    }
    const seen = new Set<string>();
    this.terms = candidates
      .filter((term) => {
        const key = term.keys.join(" ");
        if ((owners.get(key)?.size ?? 0) > 1 || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.keys.length - a.keys.length);
  }

  find(text: string): MentionMatch[] {
    const tokens = tokenize(text);
    const matches: MentionMatch[] = [];
    let index = 0;
    while (index < tokens.length) {
      const term = this.terms.find((candidate) =>
        startsWith(tokens, index, candidate.keys),
      );
      if (term) {
        const first = tokens[index] as Token;
        const last = tokens[index + term.keys.length - 1] as Token;
        matches.push({
          start: first.start,
          end: last.end,
          ingredientId: term.ingredientId,
        });
        index += term.keys.length;
      } else {
        index += 1;
      }
    }
    return matches;
  }

  /** Resolves `{ail}` to an ingredient id, tolerant of accents and plurals. */
  resolve(reference: string): string | null {
    const keys = tokenize(reference).map((token) => token.key);
    if (!keys.length) return null;
    const wanted = keys.join(" ");
    const exact = [...this.fullNames, ...this.terms].find(
      (term) => term.keys.join(" ") === wanted,
    );
    if (exact) return exact.ingredientId;
    return (
      this.fullNames.find((term) => term.keys.join(" ").startsWith(wanted))
        ?.ingredientId ?? null
    );
  }
}

function startsWith(tokens: Token[], index: number, keys: string[]): boolean {
  return keys.every((key, offset) => tokens[index + offset]?.key === key);
}
