"use client";

import { Check, ChevronDown, ListChecks } from "lucide-react";
import { useId, useState } from "react";

import { formatIngredient } from "@/lib/recipes/format";
import type { Ingredient, IngredientGroup } from "@/lib/recipes/types";
import { cn } from "@/lib/utils";

interface PrepChecklistProps {
  groups: IngredientGroup[];
  ingredients: Map<string, Ingredient>;
  factor: number;
  checked: string[];
  onToggle: (ingredientId: string) => void;
  onSetAll: (ingredientIds: string[]) => void;
  /** On phones the list folds into a card; on wide screens it stays open. */
  collapsible: boolean;
}

/** « Mise en place »: every ingredient with its quantity, to tick once ready. */
export function PrepChecklist({
  groups,
  ingredients,
  factor,
  checked,
  onToggle,
  onSetAll,
  collapsible,
}: PrepChecklistProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const allIds = groups.flatMap((group) => group.ingredientIds);
  const readyCount = allIds.filter((id) => checked.includes(id)).length;
  const allReady = readyCount === allIds.length;
  const expanded = !collapsible || open;
  const summary = allReady
    ? "Tout est prêt"
    : `${readyCount} sur ${allIds.length} ingrédient${allIds.length > 1 ? "s prêts" : " prêt"}`;

  const header = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <ListChecks aria-hidden className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-bold">Mise en place</span>
        <span className="text-sm text-muted">{summary}</span>
      </span>
    </>
  );

  return (
    <section
      aria-label="Mise en place"
      className="overflow-hidden rounded-[20px] bg-surface"
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-16 w-full items-center gap-3 py-3 pr-4 pl-3 text-left"
        >
          {header}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-5 shrink-0 text-muted transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      ) : (
        <div className="flex items-center gap-3 py-3 pr-4 pl-3">{header}</div>
      )}

      {expanded && (
        <div id={panelId} className="flex flex-col gap-3 px-1.5 pb-2.5">
          {groups.map((group, index) => (
            <div key={group.name ?? index} className="flex flex-col">
              {group.name && (
                <h3 className="px-2.5 pt-1 pb-1 text-xs font-bold tracking-[0.08em] text-muted uppercase">
                  {group.name}
                </h3>
              )}
              <ul className="flex flex-col">
                {group.ingredientIds.map((id) => {
                  const ingredient = ingredients.get(id);
                  if (!ingredient) return null;
                  const { amount, name } = formatIngredient(ingredient, factor);
                  const done = checked.includes(id);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        aria-pressed={done}
                        onClick={() => onToggle(id)}
                        className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[15px] hover:bg-inset"
                      >
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                            done
                              ? "border-accent bg-accent text-on-accent"
                              : "border-line-strong text-transparent",
                          )}
                        >
                          <Check
                            aria-hidden
                            className="size-3.5"
                            strokeWidth={3.4}
                          />
                        </span>
                        <span
                          className={cn(
                            "w-[5.5rem] shrink-0 font-bold tabular-nums",
                            done &&
                              "text-muted line-through decoration-muted/50",
                          )}
                        >
                          {amount || "—"}
                        </span>{" "}
                        <span
                          className={cn(
                            "min-w-0 flex-1",
                            done &&
                              "text-muted line-through decoration-muted/50",
                          )}
                        >
                          {name}
                          {ingredient.note && (
                            <span className="text-muted">
                              {" "}
                              · {ingredient.note}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {allIds.length > 0 && (
            <div className="flex justify-end px-1.5 pt-1">
              <button
                type="button"
                onClick={() => onSetAll(allReady ? [] : allIds)}
                className="h-11 rounded-xl px-3 text-sm font-bold text-accent hover:bg-inset"
              >
                {allReady ? "Tout décocher" : "Tout cocher"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
