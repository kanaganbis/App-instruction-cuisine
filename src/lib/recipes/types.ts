/** A quantity as written in the recipe, e.g. `2` or `2 à 3`. */
export interface Quantity {
  min: number;
  /** Upper bound for ranges such as « 2 à 3 gousses ». */
  max?: number;
}

export type UnitKind = "mass" | "volume" | "spoon" | "count";

export interface Ingredient {
  /** Stable identifier inside the recipe (used by `{ref}` and persisted state). */
  id: string;
  /** The ingredient line as written, without list markers. */
  line: string;
  quantity: Quantity | null;
  unitId: string | null;
  /** Ingredient name, e.g. « riz basmati complet ». */
  name: string;
  /** Preparation detail, e.g. « émincé », « facultatif ». */
  note: string | null;
  /** Vague amount when there is no number, e.g. « quelques ». */
  qualifier: string | null;
  group: string | null;
}

export interface IngredientGroup {
  name: string | null;
  ingredientIds: string[];
}

export type Inline =
  | { type: "text"; value: string }
  | { type: "strong"; children: Inline[] }
  | { type: "emphasis"; children: Inline[] }
  | { type: "code"; value: string }
  /**
   * A reference to an ingredient. `explicit` comes from `{name}` in the step
   * and is displayed with its scaled quantity; `mention` is a word of the text
   * recognised as an ingredient and keeps its original wording.
   */
  | {
      type: "ingredient";
      ingredientId: string;
      mode: "explicit" | "mention";
      text: string;
    }
  | { type: "duration"; seconds: number; text: string };

export interface StepTimer {
  seconds: number;
  /** `explicit` comes from a « ⏱ 25 min » line, `detected` from the step text. */
  source: "explicit" | "detected";
}

export interface Step {
  index: number;
  title: string | null;
  paragraphs: Inline[][];
  tips: Inline[][];
  timer: StepTimer | null;
  /** Ingredients used in this step, in recipe order. */
  ingredientIds: string[];
}

export interface RecipeNote {
  title: string;
  markdown: string;
}

export interface RecipeMeta {
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  restMinutes: number | null;
  totalMinutes: number | null;
  category: string | null;
  tags: string[];
  difficulty: string | null;
  source: string | null;
  /** Image as written in the recipe (relative path or URL). */
  image: string | null;
}

export interface Recipe {
  slug: string;
  /** Path of the Markdown file, relative to the recipes folder. */
  file: string;
  title: string;
  description: string | null;
  meta: RecipeMeta;
  ingredients: Ingredient[];
  ingredientGroups: IngredientGroup[];
  steps: Step[];
  notes: RecipeNote[];
  /** Problems found while reading the file, shown to help fix the Markdown. */
  warnings: string[];
}

/** What the recipe library needs, without the full step content. */
export interface RecipeSummary {
  slug: string;
  file: string;
  title: string;
  description: string | null;
  meta: RecipeMeta;
  imageUrl: string | null;
  ingredientNames: string[];
  stepCount: number;
  updatedAt: number;
  warningCount: number;
}
