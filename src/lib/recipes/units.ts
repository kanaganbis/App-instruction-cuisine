import type { UnitKind } from "./types";

export interface UnitDef {
  id: string;
  kind: UnitKind;
  singular: string;
  plural: string;
  /** Compact label for ingredient lists, e.g. « c. à s. ». */
  short?: string;
  /** For mass and volume: value of one unit in grams or millilitres. */
  base?: number;
  aliases: string[];
}

const UNITS: UnitDef[] = [
  {
    id: "mg",
    kind: "mass",
    singular: "mg",
    plural: "mg",
    base: 0.001,
    aliases: ["mg", "milligrammes?"],
  },
  {
    id: "g",
    kind: "mass",
    singular: "g",
    plural: "g",
    base: 1,
    aliases: ["g", "gr", "grammes?"],
  },
  {
    id: "kg",
    kind: "mass",
    singular: "kg",
    plural: "kg",
    base: 1000,
    aliases: ["kg", "kilos?", "kilogrammes?"],
  },
  {
    id: "ml",
    kind: "volume",
    singular: "ml",
    plural: "ml",
    base: 1,
    aliases: ["ml", "millilitres?"],
  },
  {
    id: "cl",
    kind: "volume",
    singular: "cl",
    plural: "cl",
    base: 10,
    aliases: ["cl", "centilitres?"],
  },
  {
    id: "dl",
    kind: "volume",
    singular: "dl",
    plural: "dl",
    base: 100,
    aliases: ["dl", "décilitres?"],
  },
  {
    id: "l",
    kind: "volume",
    singular: "l",
    plural: "l",
    base: 1000,
    aliases: ["l", "litres?"],
  },
  {
    id: "cs",
    kind: "spoon",
    singular: "c. à soupe",
    plural: "c. à soupe",
    short: "c. à s.",
    aliases: [
      "c\\. ?à ?soupe",
      "c\\. ?a ?soupe",
      "c\\. ?à ?s\\.?",
      "c\\.s\\.?",
      "càs",
      "cas",
      "cs",
      "cuil(?:l[eè]re)?s?\\.? (?:à|a) soupe",
      "cuillères? (?:à|a) soupe",
      "tbsp",
    ],
  },
  {
    id: "cc",
    kind: "spoon",
    singular: "c. à café",
    plural: "c. à café",
    short: "c. à c.",
    aliases: [
      "c\\. ?à ?café",
      "c\\. ?a ?cafe",
      "c\\. ?à ?c\\.?",
      "c\\.c\\.?",
      "càc",
      "cac",
      "cc",
      "cuil(?:l[eè]re)?s?\\.? (?:à|a) café",
      "cuillères? (?:à|a) café",
      "tsp",
    ],
  },
  ...(
    [
      ["pincee", "pincée", "pincées"],
      ["gousse", "gousse", "gousses"],
      ["brin", "brin", "brins"],
      ["branche", "branche", "branches"],
      ["tige", "tige", "tiges"],
      ["feuille", "feuille", "feuilles"],
      ["tranche", "tranche", "tranches"],
      ["rondelle", "rondelle", "rondelles"],
      ["boite", "boîte", "boîtes"],
      ["conserve", "conserve", "conserves"],
      ["bocal", "bocal", "bocaux"],
      ["pot", "pot", "pots"],
      ["sachet", "sachet", "sachets"],
      ["paquet", "paquet", "paquets"],
      ["barquette", "barquette", "barquettes"],
      ["verre", "verre", "verres"],
      ["tasse", "tasse", "tasses"],
      ["bol", "bol", "bols"],
      ["louche", "louche", "louches"],
      ["botte", "botte", "bottes"],
      ["bouquet", "bouquet", "bouquets"],
      ["poignee", "poignée", "poignées"],
      ["filet", "filet", "filets"],
      ["noix", "noix", "noix"],
      ["noisette", "noisette", "noisettes"],
      ["morceau", "morceau", "morceaux"],
      ["cube", "cube", "cubes"],
      ["carre", "carré", "carrés"],
      ["dose", "dose", "doses"],
      ["zeste", "zeste", "zestes"],
      ["quartier", "quartier", "quartiers"],
      ["pave", "pavé", "pavés"],
      ["boule", "boule", "boules"],
      ["cm", "cm", "cm"],
    ] as const
  ).map(([id, singular, plural]): UnitDef => ({
    id,
    kind: "count",
    singular,
    plural,
    aliases: [escape(singular), escape(plural)],
  })),
];

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BY_ID = new Map(UNITS.map((unit) => [unit.id, unit]));

/** Every alias with its unit, longest first so « c. à soupe » wins over « c. ». */
const ALIASES = [
  ...new Map(
    UNITS.flatMap((unit) =>
      unit.aliases.map((alias) => [alias, unit.id] as const),
    ),
  ).entries(),
].sort((a, b) => b[0].length - a[0].length);

/** A unit at the start of a string, followed by a non-letter. */
const UNIT_PATTERN = new RegExp(
  `^(?:${ALIASES.map(([alias], index) => `(?<u${index}>${alias})`).join("|")})(?![\\p{L}])\\.?`,
  "iu",
);

export function getUnit(id: string): UnitDef {
  const unit = BY_ID.get(id);
  if (!unit) throw new Error(`Unknown unit: ${id}`);
  return unit;
}

/** Reads a unit at the start of `text`; returns its id and the rest. */
export function matchUnit(
  text: string,
): { unitId: string; rest: string } | null {
  const match = UNIT_PATTERN.exec(text);
  if (!match?.groups) return null;
  const key = Object.entries(match.groups).find(
    ([, value]) => value !== undefined,
  )?.[0];
  const unitId = key ? ALIASES[Number(key.slice(1))]?.[1] : undefined;
  return unitId ? { unitId, rest: text.slice(match[0].length) } : null;
}
