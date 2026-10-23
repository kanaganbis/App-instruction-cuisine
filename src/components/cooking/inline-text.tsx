import { Timer } from "lucide-react";
import type { ReactNode } from "react";

import { formatIngredient } from "@/lib/recipes/format";
import type { Ingredient, Inline } from "@/lib/recipes/types";
import { cn } from "@/lib/utils";

export interface DurationControl {
  onToggle: (seconds: number) => void;
  /** Countdown to show instead of the written duration, when a timer runs. */
  label: (seconds: number) => string | null;
}

interface InlineTextProps {
  nodes: Inline[];
  ingredients: Map<string, Ingredient>;
  factor: number;
  /** `current` highlights quantities; `preview` is the quieter look of upcoming steps. */
  tone: "current" | "preview";
  /** Durations become timer buttons when given. */
  durations?: DurationControl;
}

/**
 * Step text with the ingredient quantities written inside the sentence,
 * scaled to the chosen servings.
 */
export function InlineText({
  nodes,
  ingredients,
  factor,
  tone,
  durations,
}: InlineTextProps) {
  return (
    <>
      {nodes.map((node, index) =>
        renderNode(node, index, { ingredients, factor, tone, durations }),
      )}
    </>
  );
}

function renderNode(
  node: Inline,
  key: number,
  props: Omit<InlineTextProps, "nodes">,
): ReactNode {
  switch (node.type) {
    case "text":
      return node.value;
    case "strong":
      return (
        <strong key={key}>
          {node.children.map((child, index) => renderNode(child, index, props))}
        </strong>
      );
    case "emphasis":
      return (
        <em key={key}>
          {node.children.map((child, index) => renderNode(child, index, props))}
        </em>
      );
    case "code":
      return (
        <code
          key={key}
          className="rounded bg-inset px-1 font-mono text-[0.9em]"
        >
          {node.value}
        </code>
      );
    case "ingredient": {
      const ingredient = props.ingredients.get(node.ingredientId);
      if (node.mode === "mention" || !ingredient) {
        return (
          <span
            key={key}
            className={cn(
              props.tone === "current" &&
                "font-semibold underline decoration-accent/35 decoration-2 underline-offset-[5px]",
            )}
          >
            {node.text}
          </span>
        );
      }
      return (
        <span
          key={key}
          className={cn(
            "rounded-[7px] box-decoration-clone px-1.5 py-px font-bold",
            props.tone === "current"
              ? "bg-accent-soft text-on-accent-soft"
              : "bg-mention text-on-mention",
          )}
        >
          {formatIngredient(ingredient, props.factor).phrase}
        </span>
      );
    }
    case "duration": {
      const control = props.durations;
      if (!control) return <strong key={key}>{node.text}</strong>;
      const running = control.label(node.seconds);
      return (
        <button
          key={key}
          type="button"
          onClick={() => control.onToggle(node.seconds)}
          aria-label={
            running
              ? `Minuteur ${node.text} : ${running}, mettre en pause ou reprendre`
              : `Lancer un minuteur de ${node.text}`
          }
          className={cn(
            "mx-px inline-flex translate-y-[-1px] items-center gap-1 rounded-[7px] px-1.5 align-baseline font-bold whitespace-nowrap tabular-nums transition-colors",
            running
              ? "bg-warm-strong text-on-warm-strong"
              : "bg-warm text-on-warm hover:bg-warm-strong hover:text-on-warm-strong",
          )}
        >
          <Timer aria-hidden className="size-[0.95em]" strokeWidth={2.4} />
          {running ?? node.text}
        </button>
      );
    }
  }
}
