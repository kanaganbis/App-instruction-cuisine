"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";

import { formatClock, formatDuration } from "@/lib/recipes/duration";
import { stepLabel } from "@/lib/recipes/inline";
import type { Recipe } from "@/lib/recipes/types";
import { useHydrated, useNow, useSession } from "@/lib/cooking/hooks";
import { requestNotifications, unlockAudio } from "@/lib/cooking/sound";
import {
  timerStatus,
  useCookingStore,
  type TimerState,
} from "@/lib/cooking/store";
import { useWakeLock } from "@/lib/cooking/use-wake-lock";

import { ServingsStepper, WakeLockToggle } from "./controls";
import { PrepChecklist } from "./prep-checklist";
import { StepTimeline, type StepTimerView } from "./step-timeline";
import { TimerDock } from "./timer-dock";

interface CookingViewProps {
  recipe: Recipe;
  /** Extra sections of the recipe (« Conseils »…), rendered on the server. */
  notes?: ReactNode;
}

const timerId = (stepIndex: number, seconds: number) =>
  `step-${stepIndex}-${seconds}`;

export function CookingView({ recipe, notes }: CookingViewProps) {
  const { slug, steps } = recipe;
  const hydrated = useHydrated();
  const session = useSession(slug);
  const keepAwake = useCookingStore((state) => state.keepAwake);
  const store = useCookingStore.getState;
  const wakeLock = useWakeLock(hydrated && keepAwake);

  const ingredients = useMemo(
    () =>
      new Map(
        recipe.ingredients.map((ingredient) => [ingredient.id, ingredient]),
      ),
    [recipe.ingredients],
  );

  const baseServings = recipe.meta.servings;
  const servings = session.servings ?? baseServings ?? 1;
  const factor = baseServings ? servings / baseServings : servings;
  const current = Math.min(session.currentStep, steps.length);
  const finished = current >= steps.length;

  const timers = session.timers;
  const now = useNow(hydrated && timers.length > 0);

  const timerView = useCallback(
    (stepIndex: number, seconds: number): StepTimerView => {
      const timer = timers.find(
        (item) => item.id === timerId(stepIndex, seconds),
      );
      if (!timer) return { status: "idle", clock: formatClock(seconds) };
      const { status, remainingMs } = timerStatus(timer, now);
      return { status, clock: formatClock(remainingMs / 1000) };
    },
    [timers, now],
  );

  const toggleTimer = (stepIndex: number, seconds: number) => {
    unlockAudio();
    requestNotifications();
    const step = steps[stepIndex];
    const name = step ? stepLabel(step, ingredients) : recipe.title;
    store().toggleTimer(slug, {
      id: timerId(stepIndex, seconds),
      label:
        step?.timer?.seconds === seconds
          ? name
          : `${name} (${formatDuration(seconds)})`,
      recipeTitle: recipe.title,
      stepIndex,
      seconds,
    });
  };

  const goTo = useCallback(
    (index: number) => store().setStep(slug, index),
    [slug, store],
  );

  // Bring the current step into view when it changes, including on resume.
  const currentRef = useRef<HTMLElement>(null);
  const lastStep = useRef<number | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const previous = lastStep.current;
    lastStep.current = current;
    if (previous === null && current === 0) return;
    if (previous === current) return;
    currentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hydrated, current]);

  // ← / → move between steps on a keyboard.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "ArrowRight" && current < steps.length)
        goTo(current + 1);
      if (event.key === "ArrowLeft" && current > 0) goTo(current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, steps.length, goTo]);

  const checklist = (collapsible: boolean) => (
    <PrepChecklist
      groups={recipe.ingredientGroups}
      ingredients={ingredients}
      factor={factor}
      checked={session.checked}
      onToggle={(id) => store().toggleChecked(slug, id)}
      onSetAll={(ids) => store().setChecked(slug, ids)}
      collapsible={collapsible}
    />
  );

  const ahead = steps.length - current - 1;
  const { prepMinutes, cookMinutes, totalMinutes } = recipe.meta;
  const times = [
    prepMinutes !== null && {
      label: "Préparation",
      value: formatDuration(prepMinutes * 60),
    },
    cookMinutes !== null && {
      label: "Cuisson",
      value: formatDuration(cookMinutes * 60),
    },
    prepMinutes === null &&
      cookMinutes === null &&
      totalMinutes !== null && {
        label: "Durée",
        value: formatDuration(totalMinutes * 60),
      },
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const kicker = [recipe.meta.category, ...recipe.meta.tags.slice(0, 2)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-4 pb-44 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="Retour aux recettes"
          className="flex size-11 items-center justify-center rounded-full border border-line bg-surface hover:bg-inset"
        >
          <ChevronLeft aria-hidden className="size-5" strokeWidth={2.2} />
        </Link>
        {hydrated && (
          <WakeLockToggle
            wanted={keepAwake}
            status={wakeLock.status}
            onToggle={() => {
              const next = !keepAwake;
              store().setKeepAwake(next);
              if (next) wakeLock.activate();
            }}
          />
        )}
      </div>

      <div className="mt-4 lg:grid lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <aside className="hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:rounded-[20px]">
          {hydrated ? (
            checklist(false)
          ) : (
            <div className="h-96 animate-pulse rounded-[20px] bg-surface" />
          )}
        </aside>

        <main className="mx-auto w-full max-w-2xl lg:mx-0">
          <header className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {kicker && (
                <p className="text-[13px] font-bold tracking-[0.08em] text-accent uppercase">
                  {kicker}
                </p>
              )}
              <h1 className="font-display text-[31px] leading-[1.08] font-bold tracking-tight text-balance sm:text-4xl">
                {recipe.title}
              </h1>
              {recipe.description && (
                <p className="text-pretty text-muted">{recipe.description}</p>
              )}
            </div>

            <div className="flex items-stretch gap-2">
              {times.map((time) => (
                <div
                  key={time.label}
                  className="flex flex-1 flex-col gap-0.5 rounded-2xl bg-surface px-3 py-2.5"
                >
                  <span className="text-xs font-semibold text-muted">
                    {time.label}
                  </span>
                  <span className="text-[17px] font-bold">{time.value}</span>
                </div>
              ))}
              <div className={times.length ? "flex-[1.5]" : "flex-1"}>
                {hydrated ? (
                  <ServingsStepper
                    value={servings}
                    unit={baseServings ? "portions" : "fois"}
                    onChange={(value) =>
                      store().setServings(
                        slug,
                        Math.min(24, Math.max(1, value)),
                      )
                    }
                  />
                ) : (
                  <div className="h-14 animate-pulse rounded-2xl bg-surface" />
                )}
              </div>
            </div>

            {steps.length > 0 && (
              <div className="flex flex-col gap-2" aria-live="polite">
                <div className="flex justify-between text-sm font-bold">
                  <span>
                    {!hydrated
                      ? " "
                      : finished
                        ? "Recette terminée"
                        : `Étape ${current + 1} sur ${steps.length}`}
                  </span>
                  <span className="font-semibold text-muted">
                    {hydrated &&
                      !finished &&
                      (ahead === 0 ? "Dernière étape" : `${ahead} à venir`)}
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-line"
                  role="progressbar"
                  aria-label="Avancement de la recette"
                  aria-valuemin={0}
                  aria-valuemax={steps.length}
                  aria-valuenow={hydrated ? current : 0}
                >
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500"
                    style={{
                      width: `${hydrated ? (current / steps.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </header>

          <div className="mt-[18px] lg:hidden">
            {hydrated ? (
              checklist(true)
            ) : (
              <div className="h-16 animate-pulse rounded-[20px] bg-surface" />
            )}
          </div>

          {hydrated ? (
            steps.length > 0 && (
              <StepTimeline
                steps={steps}
                ingredients={ingredients}
                factor={factor}
                current={current}
                timer={timerView}
                onToggleTimer={toggleTimer}
                onGo={goTo}
                onComplete={(index) => goTo(index + 1)}
                onRestart={() => store().resetSession(slug)}
                currentRef={currentRef}
              />
            )
          ) : (
            <div className="mt-6 flex flex-col gap-4" aria-hidden>
              <div className="h-64 animate-pulse rounded-[22px] bg-surface" />
              <div className="h-24 animate-pulse rounded-[22px] bg-surface/60" />
            </div>
          )}

          {notes}
        </main>
      </div>

      {hydrated && (
        <TimerDock
          timers={timers}
          now={now}
          onToggle={(timer: TimerState) => {
            unlockAudio();
            store().toggleTimer(slug, {
              ...timer,
              seconds: timer.durationMs / 1000,
            });
          }}
          onRemove={(timer) => store().removeTimer(slug, timer.id)}
        />
      )}
    </div>
  );
}
