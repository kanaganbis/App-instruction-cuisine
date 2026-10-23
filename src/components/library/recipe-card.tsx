import { ArrowRight, Clock, ListChecks, Timer, Users } from "lucide-react";

import { formatDuration } from "@/lib/recipes/duration";
import { href } from "@/lib/router";
import type { RecipeSummary } from "@/lib/recipes/types";
import { cn } from "@/lib/utils";

export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  const { meta } = recipe;
  return (
    <a
      href={href.recipe(recipe.slug)}
      className="group flex w-full flex-col overflow-hidden rounded-[22px] bg-surface shadow-card transition-transform duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
    >
      <div
        className={cn(
          "relative overflow-hidden bg-accent-soft",
          recipe.imageUrl ? "aspect-[16/10]" : "h-[5.5rem]",
        )}
      >
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span
            aria-hidden
            className="absolute -right-1 -bottom-5 font-display text-[112px] leading-none font-bold text-accent/20 select-none"
          >
            {recipe.title.charAt(0)}
          </span>
        )}
        {meta.category && (
          <span className="absolute top-3 left-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-bold text-accent backdrop-blur">
            {meta.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="font-display text-xl leading-tight font-bold tracking-tight text-balance">
          {recipe.title}
        </h2>
        {recipe.description && (
          <p className="line-clamp-2 text-sm text-muted">
            {recipe.description}
          </p>
        )}
        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-ink-soft">
          {meta.totalMinutes !== null && (
            <li className="flex items-center gap-1.5">
              <Clock aria-hidden className="size-4 text-muted" />
              {formatDuration(meta.totalMinutes * 60)}
            </li>
          )}
          {meta.servings !== null && (
            <li className="flex items-center gap-1.5">
              <Users aria-hidden className="size-4 text-muted" />
              {meta.servings} portion{meta.servings > 1 ? "s" : ""}
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <ListChecks aria-hidden className="size-4 text-muted" />
            {recipe.ingredientNames.length} ingrédient
            {recipe.ingredientNames.length > 1 ? "s" : ""}
          </li>
        </ul>
        {meta.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Étiquettes">
            {meta.tags.slice(0, 3).map((tag) => (
              <li
                key={tag}
                className="rounded-lg bg-inset px-2 py-0.5 text-xs font-semibold text-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>
    </a>
  );
}

interface ResumeCardProps {
  recipe: RecipeSummary;
  step: number;
  runningTimers: number;
}

/** A recipe started earlier, to pick up where you left off. */
export function ResumeCard({ recipe, step, runningTimers }: ResumeCardProps) {
  const progress = recipe.stepCount ? (step / recipe.stepCount) * 100 : 0;
  return (
    <a
      href={href.recipe(recipe.slug)}
      className="flex items-center gap-4 rounded-[20px] bg-surface p-4 shadow-card transition-colors hover:bg-inset"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="truncate font-bold">{recipe.title}</span>
        <span className="flex items-center gap-3 text-sm text-muted">
          <span>
            Étape {step + 1} sur {recipe.stepCount}
          </span>
          {runningTimers > 0 && (
            <span className="flex items-center gap-1 font-semibold text-on-warm">
              <Timer aria-hidden className="size-3.5" />
              {runningTimers} minuteur{runningTimers > 1 ? "s" : ""}
            </span>
          )}
        </span>
        <span
          className="h-1.5 overflow-hidden rounded-full bg-line"
          aria-hidden
        >
          <span
            className="block h-full rounded-full bg-accent"
            style={{ width: `${progress}%` }}
          />
        </span>
      </div>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
        <ArrowRight aria-hidden className="size-5" />
        <span className="sr-only">Reprendre</span>
      </span>
    </a>
  );
}
