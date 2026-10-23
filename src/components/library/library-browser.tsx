"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { useHydrated, useNow } from "@/lib/cooking/hooks";
import { timerStatus, useCookingStore } from "@/lib/cooking/store";
import { normalize } from "@/lib/recipes/text";
import type { RecipeSummary } from "@/lib/recipes/types";
import { cn } from "@/lib/utils";

import { RecipeCard, ResumeCard } from "./recipe-card";

interface LibraryBrowserProps {
  recipes: RecipeSummary[];
}

function labelsOf(recipe: RecipeSummary): string[] {
  return [recipe.meta.category, ...recipe.meta.tags].filter(
    (label): label is string => Boolean(label),
  );
}

function haystack(recipe: RecipeSummary): string {
  return normalize(
    [
      recipe.title,
      recipe.description,
      recipe.meta.category,
      ...recipe.meta.tags,
      ...recipe.ingredientNames,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** Search, filters and the « En cours » shortcuts of the recipe library. */
export function LibraryBrowser({ recipes }: LibraryBrowserProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  // Pick up recipes added to the folder while the app was in the background.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [router]);

  const indexed = useMemo(
    () => recipes.map((recipe) => ({ recipe, text: haystack(recipe) })),
    [recipes],
  );

  // Categories and tags, merged when they only differ by case or accents.
  const filters = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const recipe of recipes) {
      const labels = new Map(
        labelsOf(recipe).map((label) => [normalize(label), label]),
      );
      for (const [key, label] of labels) {
        const entry = counts.get(key) ?? { label, count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      }
    }
    return [...counts.entries()]
      .sort(
        (a, b) =>
          b[1].count - a[1].count || a[1].label.localeCompare(b[1].label, "fr"),
      )
      .slice(0, 12)
      .map(([key, { label }]) => ({ key, label }));
  }, [recipes]);

  const words = normalize(deferredQuery).split(/\s+/).filter(Boolean);
  const visible = indexed
    .filter(({ recipe, text }) => {
      if (
        filter &&
        !labelsOf(recipe).some((label) => normalize(label) === filter)
      )
        return false;
      return words.every((word) => text.includes(word));
    })
    .map(({ recipe }) => recipe);

  const hydrated = useHydrated();
  const sessions = useCookingStore((state) => state.sessions);
  const inProgress = hydrated
    ? recipes.filter((recipe) => {
        const session = sessions[recipe.slug];
        return (
          session &&
          session.currentStep < recipe.stepCount &&
          (session.currentStep > 0 || session.timers.length > 0)
        );
      })
    : [];
  const now = useNow(
    inProgress.some(
      (recipe) => (sessions[recipe.slug]?.timers.length ?? 0) > 0,
    ),
  );

  return (
    <div className="mt-6 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <label htmlFor="search" className="sr-only">
            Rechercher une recette
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
          />
          <input
            id="search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Une recette, un ingrédient…"
            autoComplete="off"
            className="h-14 w-full rounded-2xl border border-line bg-surface pr-12 pl-12 text-base shadow-[0_1px_2px_rgb(24_33_27/0.04)] outline-none placeholder:text-muted focus:border-accent focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
              className="absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl text-muted hover:bg-inset"
            >
              <X aria-hidden className="size-5" />
            </button>
          )}
        </div>

        {filters.length > 0 && (
          <div
            className="-mx-5 scrollbar-none flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0"
            role="group"
            aria-label="Filtrer"
          >
            {[{ key: null, label: "Toutes" }, ...filters].map(
              ({ key, label }) => {
                const active = filter === key;
                return (
                  <button
                    key={key ?? "all"}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(active ? null : key)}
                    className={cn(
                      "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors",
                      active
                        ? "border-ink bg-ink text-ground"
                        : "border-line bg-surface text-ink-soft hover:bg-inset",
                    )}
                  >
                    {label}
                  </button>
                );
              },
            )}
          </div>
        )}
      </div>

      {inProgress.length > 0 && !words.length && !filter && (
        <section aria-labelledby="en-cours" className="flex flex-col gap-3">
          <h2 id="en-cours" className="font-display text-xl font-bold">
            En cours
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {inProgress.map((recipe) => {
              const session = sessions[recipe.slug];
              if (!session) return null;
              const running = session.timers.filter(
                (timer) => timerStatus(timer, now).status !== "done",
              ).length;
              return (
                <li key={recipe.slug} className="min-w-0">
                  <ResumeCard
                    recipe={recipe}
                    step={session.currentStep}
                    runningTimers={running}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-label="Recettes" className="flex flex-col gap-3">
        {(words.length > 0 || filter) && (
          <p className="text-sm font-semibold text-muted" aria-live="polite">
            {visible.length === 0
              ? "Aucune recette ne correspond."
              : `${visible.length} recette${visible.length > 1 ? "s" : ""}`}
          </p>
        )}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((recipe) => (
            <li key={recipe.slug} className="flex min-w-0">
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
