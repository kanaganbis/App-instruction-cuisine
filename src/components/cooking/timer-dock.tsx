import { Pause, Play, Timer, X } from "lucide-react";

import { formatClock } from "@/lib/recipes/duration";
import { timerStatus, type TimerState } from "@/lib/cooking/store";
import { cn } from "@/lib/utils";

interface TimerDockProps {
  timers: TimerState[];
  now: number;
  onToggle: (timer: TimerState) => void;
  onRemove: (timer: TimerState) => void;
}

/** Running timers stay visible at the bottom of the screen, whatever the step. */
export function TimerDock({ timers, now, onToggle, onRemove }: TimerDockProps) {
  if (!timers.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
      <section
        aria-label="Minuteurs"
        className="pointer-events-auto flex w-full max-w-xl flex-col gap-0.5 rounded-[22px] bg-dock p-1.5 text-on-dock shadow-[0_18px_40px_-12px_rgb(0_0_0/0.5)]"
      >
        {timers.map((timer) => {
          const { status, remainingMs } = timerStatus(timer, now);
          const step =
            timer.stepIndex !== null ? `Étape ${timer.stepIndex + 1} · ` : "";
          const state =
            status === "running"
              ? "en cours"
              : status === "paused"
                ? "en pause"
                : "terminé";
          return (
            <div
              key={timer.id}
              className="flex items-center gap-3 py-1 pr-1 pl-3"
            >
              <Timer
                aria-hidden
                className={cn(
                  "size-5 shrink-0 text-dock-accent",
                  status === "done" && "animate-ring",
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate font-bold">{timer.label}</span>
                <span className="text-xs text-dock-muted">
                  {step}
                  {state}
                </span>
              </span>
              <span
                className="font-display text-2xl font-bold tracking-tight tabular-nums"
                aria-live={status === "done" ? "assertive" : "off"}
              >
                {status === "done" ? "Prêt" : formatClock(remainingMs / 1000)}
              </span>
              {status !== "done" && (
                <button
                  type="button"
                  onClick={() => onToggle(timer)}
                  aria-label={
                    status === "running"
                      ? `Mettre en pause : ${timer.label}`
                      : `Reprendre : ${timer.label}`
                  }
                  className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-dock-button hover:brightness-125"
                >
                  {status === "running" ? (
                    <Pause
                      aria-hidden
                      className="size-[18px]"
                      strokeWidth={2.6}
                    />
                  ) : (
                    <Play aria-hidden className="size-[18px] fill-current" />
                  )}
                </button>
              )}
              {status !== "running" && (
                <button
                  type="button"
                  onClick={() => onRemove(timer)}
                  aria-label={`Supprimer le minuteur : ${timer.label}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-dock-button hover:brightness-125"
                >
                  <X aria-hidden className="size-[18px]" strokeWidth={2.6} />
                </button>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
