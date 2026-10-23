"use client";

import { Minus, Plus, Sun } from "lucide-react";

import type { WakeLockStatus } from "@/lib/cooking/use-wake-lock";
import { cn } from "@/lib/utils";

interface ServingsStepperProps {
  value: number;
  /** `portions` for recipes that say how many they serve, `fois` otherwise. */
  unit: "portions" | "fois";
  onChange: (value: number) => void;
}

export function ServingsStepper({
  value,
  unit,
  onChange,
}: ServingsStepperProps) {
  const label =
    unit === "portions" ? (value > 1 ? "portions" : "portion") : "× la recette";
  const button =
    "flex size-11 items-center justify-center rounded-xl bg-inset text-ink transition-colors hover:bg-line disabled:opacity-40";
  return (
    <div
      role="group"
      aria-label="Nombre de portions"
      className="flex items-center justify-between gap-1 rounded-2xl bg-surface p-1.5"
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Moins de portions"
      >
        <Minus aria-hidden className="size-[18px]" strokeWidth={2.4} />
      </button>
      <output
        aria-live="polite"
        className="flex flex-col items-center leading-tight"
      >
        <span className="text-lg font-extrabold tabular-nums">{value}</span>
        <span className="text-xs font-semibold text-muted">{label}</span>
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={value >= 24}
        aria-label="Plus de portions"
      >
        <Plus aria-hidden className="size-[18px]" strokeWidth={2.4} />
      </button>
    </div>
  );
}

interface WakeLockToggleProps {
  wanted: boolean;
  status: WakeLockStatus;
  onToggle: () => void;
}

export function WakeLockToggle({
  wanted,
  status,
  onToggle,
}: WakeLockToggleProps) {
  const on = wanted && status !== "unavailable";
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      title={
        status === "unavailable"
          ? "Ce navigateur ne permet pas de garder l'écran allumé"
          : "Empêche l'écran de se mettre en veille pendant que vous cuisinez"
      }
      className={cn(
        "flex h-11 items-center gap-2 rounded-full border pr-3.5 pl-2.5 text-sm font-semibold transition-colors",
        on
          ? "border-ink bg-ink text-ground"
          : "border-line bg-surface text-ink hover:bg-inset",
      )}
    >
      <Sun aria-hidden className="size-[18px]" />
      Écran allumé
    </button>
  );
}
