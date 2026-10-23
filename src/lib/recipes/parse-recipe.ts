import type {
  BlockContent,
  DefinitionContent,
  Heading,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  RootContent,
} from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { toString } from "mdast-util-to-string";
import { gfm } from "micromark-extension-gfm";
import { parse as parseYaml } from "yaml";

import { findDurations, parseDurationMinutes } from "./duration";
import { parseIngredientLine } from "./ingredient-line";
import { MentionMatcher } from "./mentions";
import { capitalize, normalize, slugify } from "./text";
import type {
  Ingredient,
  IngredientGroup,
  Inline,
  Recipe,
  RecipeMeta,
  RecipeNote,
  Step,
  StepTimer,
} from "./types";

export interface ParseOptions {
  slug: string;
  /** Path of the file relative to the recipes folder, used in messages. */
  file: string;
}

type Block = RootContent;
type SectionKind = "intro" | "ingredients" | "steps" | "other";

interface Section {
  kind: SectionKind;
  title: string;
  nodes: Block[];
}

interface RawStep {
  title: string | null;
  blocks: Block[];
}

const TIMER_LINE =
  /^(?:[⏱⏲⌛⏳]️?|minuteur|timer|chrono(?:m[eè]tre)?|dur[ée]e|temps)\s*:?\s*/iu;
const TIP_LINE =
  /^(?:💡️?\s*)?(?:astuce|conseil|note|bon à savoir|à savoir)\s*:\s*/iu;
const REFERENCE = /\{([^{}\n]{1,80})\}/g;

/**
 * Reads a recipe written in Markdown. The format is deliberately forgiving:
 * YAML front matter is optional, sections are found by their heading text
 * (« Ingrédients », « Étapes », « Préparation »…), steps can be headings,
 * a numbered list or plain paragraphs. Problems are reported in `warnings`
 * rather than thrown.
 */
export function parseRecipe(
  source: string,
  { slug, file }: ParseOptions,
): Recipe {
  const warnings: string[] = [];
  const { data, body } = splitFrontMatter(source, warnings);
  const tree = fromMarkdown(body, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });

  const { title: headingTitle, sections } = splitSections(tree.children);
  const meta = emptyMeta();
  applyFrontMatter(meta, data);

  const intro = sections.find((section) => section.kind === "intro");
  let ingredientsSection = sections.find(
    (section) => section.kind === "ingredients",
  );
  let stepsSection = sections.find((section) => section.kind === "steps");

  // Files without headings: first bullet list = ingredients, first numbered
  // list = steps.
  if (intro && (!ingredientsSection || !stepsSection)) {
    const lists = intro.nodes.filter(
      (node): node is List => node.type === "list",
    );
    const bullets = lists.find((list) => !list.ordered && !isMetaList(list));
    const numbered = lists.find((list) => list.ordered);
    if (!ingredientsSection && bullets) {
      ingredientsSection = {
        kind: "ingredients",
        title: "Ingrédients",
        nodes: [bullets],
      };
      intro.nodes = intro.nodes.filter((node) => node !== bullets);
    }
    if (!stepsSection && numbered) {
      stepsSection = { kind: "steps", title: "Étapes", nodes: [numbered] };
      intro.nodes = intro.nodes.filter((node) => node !== numbered);
    }
  }

  const introResult = readIntro(intro?.nodes ?? [], meta, body);
  if (meta.servings === null && ingredientsSection) {
    meta.servings = readServings(ingredientsSection.title, true);
  }
  if (meta.totalMinutes === null) {
    const parts = [meta.prepMinutes, meta.cookMinutes, meta.restMinutes].filter(
      (value): value is number => value !== null,
    );
    meta.totalMinutes = parts.length
      ? parts.reduce((sum, value) => sum + value, 0)
      : null;
  }

  const { ingredients, groups } = parseIngredients(
    ingredientsSection?.nodes ?? [],
  );
  if (!ingredientsSection)
    warnings.push("Aucune section « Ingrédients » trouvée.");
  else if (!ingredients.length)
    warnings.push("La section « Ingrédients » ne contient aucun ingrédient.");

  const title =
    stringValue(data.titre ?? data.title ?? data.nom) ??
    headingTitle ??
    file.replace(/\.md$/i, "").split("/").pop() ??
    slug;

  const matcher = new MentionMatcher(ingredients, [title]);
  const order = new Map(
    ingredients.map((ingredient, index) => [ingredient.id, index]),
  );
  const rawSteps = splitSteps(stepsSection?.nodes ?? []);
  const steps = rawSteps.map((raw, index) =>
    buildStep(raw, index, { matcher, order, warnings }),
  );
  if (!stepsSection) warnings.push("Aucune section « Étapes » trouvée.");
  else if (!steps.length)
    warnings.push("La section « Étapes » ne contient aucune étape.");

  const notes: RecipeNote[] = sections
    .filter((section) => section.kind === "other" && section.nodes.length)
    .map((section) => ({
      title: section.title,
      markdown: sliceSource(body, section.nodes),
    }));
  if (introResult.extra)
    notes.unshift({ title: "Présentation", markdown: introResult.extra });

  return {
    slug,
    file,
    title,
    description:
      stringValue(data.description ?? data.resume) ?? introResult.description,
    meta,
    ingredients,
    ingredientGroups: groups,
    steps,
    notes,
    warnings,
  };
}

/* ------------------------------------------------------------------------ */
/* Front matter and metadata                                                */
/* ------------------------------------------------------------------------ */

function splitFrontMatter(
  source: string,
  warnings: string[],
): { data: Record<string, unknown>; body: string } {
  const text = source.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const match = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(text);
  if (!match) return { data: {}, body: text };
  const body = text.slice(match[0].length);
  try {
    const parsed: unknown = parseYaml(match[1] ?? "");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const data: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(parsed))
        data[metaKey(key)] = value;
      return { data, body };
    }
  } catch (error) {
    warnings.push(
      `En-tête YAML illisible : ${error instanceof Error ? error.message.split("\n")[0] : "erreur inconnue"}.`,
    );
  }
  return { data: {}, body };
}

function metaKey(key: string): string {
  return normalize(key)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function emptyMeta(): RecipeMeta {
  return {
    servings: null,
    prepMinutes: null,
    cookMinutes: null,
    restMinutes: null,
    totalMinutes: null,
    category: null,
    tags: [],
    difficulty: null,
    source: null,
    image: null,
  };
}

type MetaField = keyof Omit<RecipeMeta, "tags"> | "tags";

const META_KEYS: [RegExp, MetaField][] = [
  [
    /^(portions?|personnes?|parts?|pour|nombre_de_portions|rendement|servings?|couverts?)$/,
    "servings",
  ],
  [
    /^(preparation|prep|temps_de_preparation|temps_preparation)$/,
    "prepMinutes",
  ],
  [/^(cuisson|temps_de_cuisson|temps_cuisson|cook)$/, "cookMinutes"],
  [/^(repos|temps_de_repos|refrigeration|marinade)$/, "restMinutes"],
  [/^(total|temps_total|duree|duree_totale|temps)$/, "totalMinutes"],
  [/^(categorie|category|type|type_de_plat|plat)$/, "category"],
  [/^(tags?|etiquettes?|mots_cles|regimes?)$/, "tags"],
  [/^(difficulte|niveau)$/, "difficulty"],
  [/^(source|origine|inspiration)$/, "source"],
  [/^(image|photo)$/, "image"],
];

function metaField(key: string): MetaField | null {
  return META_KEYS.find(([pattern]) => pattern.test(key))?.[1] ?? null;
}

function setMeta(meta: RecipeMeta, field: MetaField, value: unknown): void {
  switch (field) {
    case "servings":
      meta.servings ??= readServings(value);
      break;
    case "prepMinutes":
    case "cookMinutes":
    case "restMinutes":
    case "totalMinutes":
      meta[field] ??= parseDurationMinutes(value);
      break;
    case "tags": {
      const tags = Array.isArray(value)
        ? value.map(String)
        : typeof value === "string"
          ? value.split(/[,;/]/)
          : [];
      for (const tag of tags.map((item) => item.trim()).filter(Boolean)) {
        if (!meta.tags.includes(tag)) meta.tags.push(tag);
      }
      break;
    }
    default:
      meta[field] ??= stringValue(value);
  }
}

function applyFrontMatter(
  meta: RecipeMeta,
  data: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(data)) {
    const field = metaField(key);
    if (field) setMeta(meta, field, value);
  }
}

/** « 4 », « 4 personnes », « 4 à 6 parts ». `strict` requires the word. */
function readServings(value: unknown, strict = false): number | null {
  if (typeof value === "number") return value > 0 ? value : null;
  if (typeof value !== "string") return null;
  const unit = strict ? "" : "?";
  const match = new RegExp(
    `(\\d+)(?:\\s*(?:à|-)\\s*\\d+)?\\s*(?:personnes?|portions?|parts?|pers\\.?)${unit}`,
    "i",
  ).exec(value);
  if (!match?.[1]) return null;
  const number = Number(match[1]);
  return number > 0 && number < 200 ? number : null;
}

function stringValue(value: unknown): string | null {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

/** Reads « **Portions** : 4 | **Préparation** : 15 min » style lines. */
function readMetaLine(meta: RecipeMeta, line: string): boolean {
  const servings = /^pour\s+(\d+)\s*(?:personnes?|portions?|parts?)\b/i.exec(
    line.trim(),
  );
  if (servings?.[1]) {
    meta.servings ??= Number(servings[1]);
    return true;
  }
  const parts = line
    .split(/\s+[|·•]\s+|\s{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return false;
  const pairs = parts.map((part) => /^([^:]{2,40}?)\s*:\s*(.+)$/.exec(part));
  if (!pairs.every(Boolean)) return false;
  const fields = pairs.map((pair) =>
    pair?.[1] ? metaField(metaKey(pair[1])) : null,
  );
  if (!fields.every(Boolean)) return false;
  pairs.forEach((pair, index) => {
    const field = fields[index];
    if (pair?.[2] && field) setMeta(meta, field, pair[2]);
  });
  return true;
}

function isMetaList(list: List): boolean {
  return list.children.every((item) =>
    readMetaLine(emptyMeta(), toString(item)),
  );
}

function readIntro(
  nodes: Block[],
  meta: RecipeMeta,
  body: string,
): { description: string | null; extra: string | null } {
  const description: string[] = [];
  const extra: Block[] = [];
  for (const node of nodes) {
    if (node.type === "paragraph") {
      const image = node.children.find((child) => child.type === "image");
      if (image?.type === "image") meta.image ??= image.url;
      const lines = toString(node)
        .split("\n")
        .filter((line) => line.trim() && !readMetaLine(meta, line));
      if (lines.length) description.push(lines.join(" ").trim());
    } else if (node.type === "list") {
      const rest = node.children.filter(
        (item) => !readMetaLine(meta, toString(item)),
      );
      if (rest.length) extra.push(node);
    } else if (
      node.type !== "html" &&
      node.type !== "thematicBreak" &&
      node.type !== "definition"
    ) {
      extra.push(node);
    }
  }
  return {
    description: description.join("\n\n") || null,
    extra: extra.length ? sliceSource(body, extra) : null,
  };
}

/* ------------------------------------------------------------------------ */
/* Sections                                                                 */
/* ------------------------------------------------------------------------ */

function classify(heading: string): SectionKind {
  const text = normalize(heading)
    .replace(/^[^a-z]+/, "")
    .trim();
  if (
    /^(?:les |liste des |mes )?ingredients?\b|^ce qu.il (?:vous )?faut\b/.test(
      text,
    )
  ) {
    return "ingredients";
  }
  if (
    /^(?:les )?(?:etapes?|preparation|instructions?|deroule(?:ment)?|methode|realisation|marche a suivre|recette|procede|mode operatoire|progression)\b/.test(
      text,
    )
  ) {
    return "steps";
  }
  return "other";
}

function splitSections(nodes: Block[]): {
  title: string | null;
  sections: Section[];
} {
  const headings = nodes.filter(
    (node): node is Heading => node.type === "heading",
  );
  let titleHeading = headings.find((heading) => heading.depth === 1) ?? null;
  const classified = headings.filter(
    (heading) =>
      heading !== titleHeading && classify(toString(heading)) !== "other",
  );
  const sectionDepth = classified.length
    ? Math.min(...classified.map((heading) => heading.depth))
    : Math.min(
        2,
        ...headings
          .filter((heading) => heading !== titleHeading)
          .map((h) => h.depth),
      );

  if (!titleHeading) {
    const first = headings[0];
    if (
      first &&
      first.depth < sectionDepth &&
      classify(toString(first)) === "other"
    ) {
      titleHeading = first;
    }
  }

  const sections: Section[] = [{ kind: "intro", title: "", nodes: [] }];
  for (const node of nodes) {
    if (node === titleHeading) continue;
    if (node.type === "heading" && node.depth <= sectionDepth) {
      const title = toString(node).trim();
      sections.push({ kind: classify(title), title, nodes: [] });
    } else {
      sections[sections.length - 1]?.nodes.push(node);
    }
  }
  return {
    title: titleHeading ? toString(titleHeading).trim() || null : null,
    sections,
  };
}

function sliceSource(body: string, nodes: Block[]): string {
  const start = nodes[0]?.position?.start.offset;
  const end = nodes[nodes.length - 1]?.position?.end.offset;
  if (start === undefined || end === undefined) return "";
  return body.slice(start, end).trim();
}

/* ------------------------------------------------------------------------ */
/* Ingredients                                                              */
/* ------------------------------------------------------------------------ */

function parseIngredients(nodes: Block[]): {
  ingredients: Ingredient[];
  groups: IngredientGroup[];
} {
  const ingredients: Ingredient[] = [];
  const groups: IngredientGroup[] = [];
  const usedIds = new Set<string>();
  let group: string | null = null;

  const add = (text: string, groupName: string | null) => {
    const line = text.trim();
    if (!line) return;
    const parsed = parseIngredientLine(line);
    const base = slugify(parsed.name);
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
    usedIds.add(id);
    ingredients.push({ id, line, group: groupName, ...parsed });
    let target = groups.find((item) => item.name === groupName);
    if (!target) {
      target = { name: groupName, ingredientIds: [] };
      groups.push(target);
    }
    target.ingredientIds.push(id);
  };

  const addItem = (item: ListItem, groupName: string | null) => {
    const first = item.children[0];
    const text =
      first?.type === "paragraph" ? (toString(first).split("\n")[0] ?? "") : "";
    const nested = item.children.filter(
      (child): child is List => child.type === "list",
    );
    if (nested.length && /:\s*$/.test(text)) {
      const name = cleanLabel(text);
      for (const list of nested)
        for (const child of list.children) addItem(child, name);
      return;
    }
    add(text, groupName);
    for (const list of nested)
      for (const child of list.children) addItem(child, groupName);
  };

  for (const node of nodes) {
    if (node.type === "heading") {
      group = cleanLabel(toString(node));
    } else if (node.type === "paragraph") {
      const lines = toString(node).split("\n");
      const onlyStrong = node.children.every(
        (child) =>
          child.type === "strong" ||
          (child.type === "text" && !child.value.trim()),
      );
      if (lines.length === 1 && (onlyStrong || /:\s*$/.test(lines[0] ?? ""))) {
        group = cleanLabel(lines[0] ?? "");
        continue;
      }
      for (const line of lines) {
        if (/:\s*$/.test(line)) group = cleanLabel(line);
        else add(line, group);
      }
    } else if (node.type === "list") {
      for (const item of node.children) {
        const text = toString(item).trim();
        // « - Pour la sauce : » announces the items that follow.
        if (
          /:\s*$/.test(text) &&
          !item.children.some((child) => child.type === "list")
        ) {
          group = cleanLabel(text);
        } else {
          addItem(item, group);
        }
      }
    } else if (node.type === "table") {
      for (const row of node.children.slice(1)) {
        add(row.children.map((cell) => toString(cell).trim()).join(" "), group);
      }
    }
  }
  return { ingredients, groups };
}

function cleanLabel(text: string): string | null {
  return text.replace(/\s*:\s*$/, "").trim() || null;
}

/* ------------------------------------------------------------------------ */
/* Steps                                                                    */
/* ------------------------------------------------------------------------ */

function cleanStepTitle(text: string): string | null {
  const title = text
    .trim()
    .replace(/^(?:[ée]tape\s*)?\d+\s*(?:[.):–—-]\s*)?/i, "")
    .replace(/^[ée]tape\s*$/i, "")
    .replace(/[\s:.–—-]+$/, "")
    .trim();
  return title || null;
}

function splitSteps(nodes: Block[]): RawStep[] {
  const steps: RawStep[] = [];
  const last = () => steps[steps.length - 1];

  if (nodes.some((node) => node.type === "heading")) {
    for (const node of nodes) {
      if (node.type === "heading")
        steps.push({ title: cleanStepTitle(toString(node)), blocks: [] });
      else if (last()) last()?.blocks.push(node);
      else steps.push({ title: null, blocks: [node] });
    }
    return steps;
  }

  for (const node of nodes) {
    if (node.type === "list") {
      for (const item of node.children) steps.push(stepFromItem(item));
    } else if (node.type === "blockquote" && last()) {
      last()?.blocks.push(node);
    } else if (node.type === "paragraph") {
      const timerOrTip =
        TIMER_LINE.test(toString(node)) || TIP_LINE.test(toString(node));
      if (timerOrTip && last()) last()?.blocks.push(node);
      else steps.push(stepFromParagraph(node));
    }
  }
  return steps;
}

function stepFromItem(item: ListItem): RawStep {
  const [first, ...rest] = item.children;
  if (first?.type !== "paragraph")
    return { title: null, blocks: item.children };
  const { title, paragraph } = extractStrongTitle(first);
  return { title, blocks: paragraph ? [paragraph, ...rest] : rest };
}

function stepFromParagraph(paragraph: Paragraph): RawStep {
  const { title, paragraph: content } = extractStrongTitle(paragraph);
  return { title, blocks: content ? [content] : [] };
}

/** « **Faire revenir** — Chauffez l'huile… » → title + remaining paragraph. */
function extractStrongTitle(paragraph: Paragraph): {
  title: string | null;
  paragraph: Paragraph | null;
} {
  const [first, ...rest] = paragraph.children;
  if (first?.type !== "strong") return { title: null, paragraph };
  const title = cleanStepTitle(toString(first));
  const children = [...rest];
  const head = children[0];
  if (head?.type === "text") {
    const value = capitalize(head.value.replace(/^\s*[:.–—-]?\s*/, ""));
    if (value) children[0] = { ...head, value };
    else children.shift();
  }
  if (children[0]?.type === "break") children.shift();
  return {
    title,
    paragraph: children.length ? { ...paragraph, children } : null,
  };
}

interface StepContext {
  matcher: MentionMatcher;
  order: Map<string, number>;
  warnings: string[];
}

function buildStep(raw: RawStep, index: number, context: StepContext): Step {
  const used = new Set<string>();
  const durations: number[] = [];
  const paragraphs: Inline[][] = [];
  const tips: Inline[][] = [];
  let explicitTimer: number | null = null;

  // Tips mention ingredients in passing; only the instructions say what the step uses.
  const enrich = (children: PhrasingContent[], tip = false) =>
    enrichInlines(toInlines(children), {
      ...context,
      index,
      used: tip ? new Set<string>() : used,
      durations: tip ? [] : durations,
    });

  const handleParagraph = (paragraph: Paragraph, asTip = false) => {
    const text = toString(paragraph).trim();
    if (!text) return;
    if (!asTip && TIMER_LINE.test(text)) {
      const found = findDurations(text)[0];
      if (found) {
        explicitTimer = found.seconds;
        return;
      }
    }
    const tipLabel = TIP_LINE.exec(text);
    if (asTip || tipLabel) {
      tips.push(enrich(stripLeadingText(paragraph.children, TIP_LINE), true));
      return;
    }
    paragraphs.push(enrich(paragraph.children));
  };

  const handleBlock = (block: Block | BlockContent | DefinitionContent) => {
    switch (block.type) {
      case "paragraph":
        handleParagraph(block);
        break;
      case "blockquote":
        for (const child of block.children) {
          if (child.type === "paragraph") handleParagraph(child, true);
        }
        break;
      case "list":
        for (const item of block.children) item.children.forEach(handleBlock);
        break;
      case "heading":
        paragraphs.push([
          {
            type: "strong",
            children: [{ type: "text", value: toString(block) }],
          },
        ]);
        break;
      default:
        break;
    }
  };

  raw.blocks.forEach(handleBlock);

  const detected = durations.length ? Math.max(...durations) : null;
  const timer: StepTimer | null =
    explicitTimer !== null
      ? { seconds: explicitTimer, source: "explicit" }
      : detected !== null
        ? { seconds: detected, source: "detected" }
        : null;

  return {
    index,
    title: raw.title,
    paragraphs,
    tips,
    timer,
    ingredientIds: [...used].sort(
      (a, b) => (context.order.get(a) ?? 0) - (context.order.get(b) ?? 0),
    ),
  };
}

function stripLeadingText(
  children: PhrasingContent[],
  pattern: RegExp,
): PhrasingContent[] {
  const [first, ...rest] = children;
  if (first?.type === "text") {
    const value = capitalize(first.value.replace(pattern, ""));
    return value ? [{ ...first, value }, ...rest] : rest;
  }
  if (first?.type === "strong" && pattern.test(`${toString(first)}:`)) {
    const [next, ...others] = rest;
    if (next?.type === "text") {
      const value = capitalize(next.value.replace(/^\s*:?\s*/, ""));
      return value ? [{ ...next, value }, ...others] : others;
    }
    return rest;
  }
  return children;
}

function toInlines(nodes: PhrasingContent[]): Inline[] {
  const out: Inline[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        out.push({ type: "text", value: node.value });
        break;
      case "strong":
        out.push({ type: "strong", children: toInlines(node.children) });
        break;
      case "emphasis":
        out.push({ type: "emphasis", children: toInlines(node.children) });
        break;
      case "inlineCode":
        out.push({ type: "code", value: node.value });
        break;
      case "break":
        out.push({ type: "text", value: " " });
        break;
      case "delete":
      case "link":
      case "linkReference":
        out.push(...toInlines(node.children));
        break;
      default:
        break;
    }
  }
  return out;
}

interface EnrichContext extends StepContext {
  index: number;
  used: Set<string>;
  durations: number[];
}

function enrichInlines(nodes: Inline[], context: EnrichContext): Inline[] {
  return nodes.flatMap((node): Inline[] => {
    if (node.type === "text") return enrichText(node.value, context);
    if (node.type === "strong" || node.type === "emphasis") {
      return [{ ...node, children: enrichInlines(node.children, context) }];
    }
    return [node];
  });
}

function enrichText(value: string, context: EnrichContext): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of value.matchAll(REFERENCE)) {
    out.push(...detect(value.slice(last, match.index), context));
    const reference = (match[1] ?? "").trim();
    const id = context.matcher.resolve(reference);
    if (id) {
      context.used.add(id);
      out.push({
        type: "ingredient",
        ingredientId: id,
        mode: "explicit",
        text: reference,
      });
    } else {
      context.warnings.push(
        `Étape ${context.index + 1} : « {${reference}} » ne correspond à aucun ingrédient de la liste.`,
      );
      out.push(...detect(reference, context));
    }
    last = match.index + match[0].length;
  }
  out.push(...detect(value.slice(last), context));
  return out;
}

/** Turns durations and ingredient names of plain text into their own nodes. */
function detect(text: string, context: EnrichContext): Inline[] {
  if (!text) return [];
  const durations = findDurations(text);
  const mentions = context.matcher
    .find(text)
    .filter(
      (mention) =>
        !durations.some((d) => mention.start < d.end && d.start < mention.end),
    );
  const marks = [
    ...durations.map((d) => ({
      start: d.start,
      end: d.end,
      node: { type: "duration", seconds: d.seconds, text: d.text } as Inline,
    })),
    ...mentions.map((m) => ({
      start: m.start,
      end: m.end,
      node: {
        type: "ingredient",
        ingredientId: m.ingredientId,
        mode: "mention",
        text: text.slice(m.start, m.end),
      } as Inline,
    })),
  ].sort((a, b) => a.start - b.start);

  const out: Inline[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start > cursor)
      out.push({ type: "text", value: text.slice(cursor, mark.start) });
    out.push(mark.node);
    if (mark.node.type === "duration")
      context.durations.push(mark.node.seconds);
    if (mark.node.type === "ingredient")
      context.used.add(mark.node.ingredientId);
    cursor = mark.end;
  }
  if (cursor < text.length)
    out.push({ type: "text", value: text.slice(cursor) });
  return out;
}
