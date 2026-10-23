import { Check, Lightbulb, Soup, Timer } from "lucide-react";
import type { Ref } from "react";

import { formatDuration } from "@/lib/recipes/duration";
import { formatIngredient } from "@/lib/recipes/format";
import { stepLabel } from "@/lib/recipes/inline";
import type { Ingredient, Step } from "@/lib/recipes/types";
import type { TimerStatus } from "@/lib/cooking/store";
import { cn } from "@/lib/utils";

import { InlineText } from "./inline-text";

export interface StepTimerView {
  status: TimerStatus | "idle";
  /** Remaining time, « 3:12 ». */
  clock: string;
}

interface StepTimelineProps {
  steps: Step[];
  ingredients: Map<string, Ingredient>;
  factor: number;
  current: number;
  timer: (stepIndex: number, seconds: number) => StepTimerView;
  onToggleTimer: (stepIndex: number, seconds: number) => void;
  onGo: (index: number) => void;
  onComplete: (index: number) => void;
  onRestart: () => void;
  currentRef: Ref<HTMLElement>;
}

/** The recipe as one thread: done steps fold, the current one stands out, the next ones stay readable. */
export function StepTimeline({
  steps,
  ingredients,
  factor,
  current,
  timer,
  onToggleTimer,
  onGo,
  onComplete,
  onRestart,
  currentRef,
}: StepTimelineProps) {
  const finished = current >= steps.length;

  return (
    <ol aria-label="Étapes" className="flex flex-col pt-3.5">
      {steps.map((step, index) => {
        const state =
          index < current ? "done" : index === current ? "current" : "next";
        const label = stepLabel(step, ingredients);
        const runningTimer = steps[index]?.timer
          ? timer(index, steps[index].timer.seconds)
          : null;

        return (
          <li
            key={index}
            className="flex gap-3.5"
            aria-current={state === "current" ? "step" : undefined}
          >
            <div
              className="flex w-[34px] shrink-0 flex-col items-center"
              aria-hidden
            >
              <span
                className={cn(
                  "flex size-[34px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold",
                  state === "done" && "bg-accent text-on-accent",
                  state === "current" &&
                    "animate-node-pulse border-[2.5px] border-accent bg-surface text-accent",
                  state === "next" && "border-2 border-line-strong text-muted",
                )}
              >
                {state === "done" ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "my-1 min-h-3.5 w-0.5 flex-1 rounded-full",
                  state === "done" ? "bg-accent" : "bg-line",
                )}
              />
            </div>

            <div className="min-w-0 flex-1 pb-4">
              {state === "done" && (
                <button
                  type="button"
                  onClick={() => onGo(index)}
                  className="flex min-h-11 w-full items-start justify-between gap-2.5 pt-1 text-left"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-bold text-ink-soft">{label}</span>
                    <span className="text-sm text-muted tabular-nums">
                      {runningTimer &&
                      runningTimer.status !== "idle" &&
                      runningTimer.status !== "done"
                        ? `Minuteur ${runningTimer.status === "paused" ? "en pause" : "en cours"} · ${runningTimer.clock}`
                        : "Terminée"}
                    </span>
                  </span>
                  <span className="pt-px text-sm font-bold text-accent">
                    Revoir
                  </span>
                </button>
              )}

              {state === "current" && (
                <article
                  ref={currentRef}
                  className="flex scroll-mt-4 flex-col gap-3.5 rounded-[22px] bg-surface p-[18px] shadow-card"
                >
                  <header className="flex flex-col gap-1">
                    <p className="text-xs font-extrabold tracking-[0.08em] text-accent uppercase">
                      Étape {index + 1} · en cours
                    </p>
                    {step.title && (
                      <h2 className="font-display text-2xl leading-tight font-bold tracking-tight">
                        {step.title}
                      </h2>
                    )}
                  </header>

                  {step.paragraphs.map((paragraph, key) => (
                    <p key={key} className="text-lg leading-[1.62] text-pretty">
                      <InlineText
                        nodes={paragraph}
                        ingredients={ingredients}
                        factor={factor}
                        tone="current"
                        durations={{
                          onToggle: (seconds) => onToggleTimer(index, seconds),
                          label: (seconds) => {
                            const view = timer(index, seconds);
                            return view.status === "running" ||
                              view.status === "paused"
                              ? view.clock
                              : null;
                          },
                        }}
                      />
                    </p>
                  ))}

                  {step.tips.map((tip, key) => (
                    <p
                      key={key}
                      className="flex items-start gap-2 text-[15px] leading-normal text-ink-soft"
                    >
                      <Lightbulb
                        aria-hidden
                        className="mt-0.5 size-[18px] shrink-0 text-on-warm"
                      />
                      <span>
                        <InlineText
                          nodes={tip}
                          ingredients={ingredients}
                          factor={factor}
                          tone="preview"
                        />
                      </span>
                    </p>
                  ))}

                  {step.ingredientIds.length > 0 && (
                    <div className="flex flex-col gap-2 pt-0.5">
                      <p className="text-[13px] font-bold text-muted">
                        Pour cette étape
                      </p>
                      <ul className="flex flex-wrap gap-1.5">
                        {step.ingredientIds.map((id) => {
                          const ingredient = ingredients.get(id);
                          if (!ingredient) return null;
                          const { amount, tail } = formatIngredient(
                            ingredient,
                            factor,
                          );
                          return (
                            <li
                              key={id}
                              className="rounded-[10px] bg-inset px-2.5 py-1.5 text-sm"
                            >
                              {amount && (
                                <span className="font-extrabold tabular-nums">
                                  {amount}{" "}
                                </span>
                              )}
                              {tail}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {step.timer && runningTimer && (
                      <MainTimerButton
                        seconds={step.timer.seconds}
                        view={runningTimer}
                        onClick={() =>
                          step.timer && onToggleTimer(index, step.timer.seconds)
                        }
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onComplete(index)}
                      className="flex h-[52px] min-w-40 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-4 font-bold text-on-accent transition-colors hover:bg-accent-hover"
                    >
                      {index === steps.length - 1
                        ? "Terminer la recette"
                        : "Étape terminée"}
                      <Check
                        aria-hidden
                        className="size-[18px]"
                        strokeWidth={2.6}
                      />
                    </button>
                  </div>
                </article>
              )}

              {state === "next" && (
                <button
                  type="button"
                  onClick={() => onGo(index)}
                  className="flex w-full flex-col gap-1.5 pt-[5px] text-left"
                  aria-label={`Aller à l'étape ${index + 1} : ${label}`}
                >
                  <span className="text-[17px] font-bold">{label}</span>
                  {step.paragraphs.map((paragraph, key) => (
                    <span
                      key={key}
                      className="block text-[15px] leading-relaxed text-pretty text-ink-soft"
                    >
                      <InlineText
                        nodes={paragraph}
                        ingredients={ingredients}
                        factor={factor}
                        tone="preview"
                      />
                    </span>
                  ))}
                  {step.timer && (
                    <span className="inline-flex items-center gap-1.5 self-start rounded-lg bg-warm px-2 py-1 text-[13px] font-bold text-on-warm">
                      <Timer
                        aria-hidden
                        className="size-3.5"
                        strokeWidth={2.4}
                      />
                      Minuteur {formatDuration(step.timer.seconds)}
                    </span>
                  )}
                </button>
              )}
            </div>
          </li>
        );
      })}

      <li className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-ink text-ground"
        >
          <Soup className="size-4" />
        </span>
        <div className="flex flex-1 flex-col gap-2.5 pt-[5px]">
          <p className="font-display text-xl font-bold">Bon appétit !</p>
          {finished && (
            <button
              type="button"
              onClick={onRestart}
              className="h-11 self-start rounded-[14px] border border-line-strong bg-surface px-4 text-[15px] font-bold hover:bg-inset"
            >
              Recommencer la recette
            </button>
          )}
        </div>
      </li>
    </ol>
  );
}

function MainTimerButton({
  seconds,
  view,
  onClick,
}: {
  seconds: number;
  view: StepTimerView;
  onClick: () => void;
}) {
  const label =
    view.status === "running"
      ? view.clock
      : view.status === "paused"
        ? `Reprendre · ${view.clock}`
        : view.status === "done"
          ? "Prêt · relancer"
          : `Minuteur ${formatDuration(seconds)}`;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        view.status === "running"
          ? `Minuteur en cours, ${view.clock} restantes. Mettre en pause`
          : view.status === "paused"
            ? `Reprendre le minuteur, ${view.clock} restantes`
            : `Lancer un minuteur de ${formatDuration(seconds)}`
      }
      className={cn(
        "flex h-[52px] shrink-0 items-center gap-2 rounded-2xl px-3.5 text-[15px] font-bold tabular-nums transition-colors",
        view.status === "running" && "bg-warm-strong text-on-warm-strong",
        view.status === "done" && "bg-ink text-ground",
        (view.status === "idle" || view.status === "paused") &&
          "bg-warm text-on-warm hover:brightness-95",
      )}
    >
      <Timer aria-hidden className="size-[18px]" strokeWidth={2.2} />
      {label}
    </button>
  );
}
