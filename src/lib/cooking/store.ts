import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface TimerState {
  id: string;
  label: string;
  recipeTitle: string;
  stepIndex: number | null;
  durationMs: number;
  /** Set while the timer runs. Timers rely on timestamps, so they stay exact in the background. */
  endsAt: number | null;
  /** Time left while paused. */
  remainingMs: number;
  /** The alarm was stopped by the cook. */
  acknowledged: boolean;
}

export interface CookingSession {
  /** Index of the current step; equals the number of steps once finished. */
  currentStep: number;
  /** Chosen servings; `null` keeps the recipe's. */
  servings: number | null;
  /** Ingredients ticked in the « Mise en place » list. */
  checked: string[];
  timers: TimerState[];
  updatedAt: number;
}

export interface StartTimer {
  id: string;
  label: string;
  recipeTitle: string;
  stepIndex: number | null;
  seconds: number;
}

interface CookingState {
  sessions: Record<string, CookingSession>;
  keepAwake: boolean;
  setStep: (slug: string, index: number) => void;
  setServings: (slug: string, servings: number | null) => void;
  toggleChecked: (slug: string, ingredientId: string) => void;
  setChecked: (slug: string, ingredientIds: string[]) => void;
  resetSession: (slug: string) => void;
  /** Starts a timer, or pauses / resumes it if it already exists; a finished one restarts. */
  toggleTimer: (slug: string, timer: StartTimer) => void;
  addTime: (slug: string, timerId: string, seconds: number) => void;
  removeTimer: (slug: string, timerId: string) => void;
  acknowledge: (slug: string, timerId: string) => void;
  setKeepAwake: (value: boolean) => void;
}

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function emptySession(): CookingSession {
  return {
    currentStep: 0,
    servings: null,
    checked: [],
    timers: [],
    updatedAt: 0,
  };
}

export type TimerStatus = "running" | "paused" | "done";

export function timerStatus(
  timer: TimerState,
  now: number,
): { status: TimerStatus; remainingMs: number } {
  if (timer.endsAt !== null) {
    const remainingMs = Math.max(0, timer.endsAt - now);
    return { status: remainingMs > 0 ? "running" : "done", remainingMs };
  }
  return {
    status: timer.remainingMs > 0 ? "paused" : "done",
    remainingMs: Math.max(0, timer.remainingMs),
  };
}

export const useCookingStore = create<CookingState>()(
  persist(
    (set) => {
      const update = (
        slug: string,
        change: (session: CookingSession) => Partial<CookingSession>,
      ) =>
        set((state) => {
          const session = state.sessions[slug] ?? emptySession();
          return {
            sessions: {
              ...state.sessions,
              [slug]: { ...session, ...change(session), updatedAt: Date.now() },
            },
          };
        });

      const updateTimer = (
        slug: string,
        timerId: string,
        change: (timer: TimerState) => TimerState | null,
      ) =>
        update(slug, (session) => ({
          timers: session.timers.flatMap((timer) => {
            if (timer.id !== timerId) return [timer];
            const next = change(timer);
            return next ? [next] : [];
          }),
        }));

      return {
        sessions: {},
        keepAwake: true,
        setStep: (slug, index) =>
          update(slug, () => ({ currentStep: Math.max(0, index) })),
        setServings: (slug, servings) => update(slug, () => ({ servings })),
        toggleChecked: (slug, ingredientId) =>
          update(slug, (session) => ({
            checked: session.checked.includes(ingredientId)
              ? session.checked.filter((id) => id !== ingredientId)
              : [...session.checked, ingredientId],
          })),
        setChecked: (slug, ingredientIds) =>
          update(slug, () => ({ checked: ingredientIds })),
        resetSession: (slug) =>
          set((state) => {
            const sessions = { ...state.sessions };
            delete sessions[slug];
            return { sessions };
          }),
        toggleTimer: (slug, { id, label, recipeTitle, stepIndex, seconds }) =>
          update(slug, (session) => {
            const now = Date.now();
            const existing = session.timers.find((timer) => timer.id === id);
            const fresh: TimerState = {
              id,
              label,
              recipeTitle,
              stepIndex,
              durationMs: seconds * 1000,
              endsAt: now + seconds * 1000,
              remainingMs: seconds * 1000,
              acknowledged: false,
            };
            if (!existing) return { timers: [...session.timers, fresh] };
            const { status, remainingMs } = timerStatus(existing, now);
            const next: TimerState =
              status === "done"
                ? fresh
                : status === "running"
                  ? { ...existing, endsAt: null, remainingMs }
                  : { ...existing, endsAt: now + remainingMs };
            return {
              timers: session.timers.map((timer) =>
                timer.id === id ? next : timer,
              ),
            };
          }),
        addTime: (slug, timerId, seconds) =>
          updateTimer(slug, timerId, (timer) => {
            const now = Date.now();
            const { status, remainingMs } = timerStatus(timer, now);
            const extra = seconds * 1000;
            if (status === "running" && timer.endsAt !== null) {
              return {
                ...timer,
                endsAt: timer.endsAt + extra,
                durationMs: timer.durationMs + extra,
              };
            }
            if (status === "done") {
              return {
                ...timer,
                endsAt: now + extra,
                durationMs: extra,
                acknowledged: false,
              };
            }
            return {
              ...timer,
              remainingMs: remainingMs + extra,
              durationMs: timer.durationMs + extra,
            };
          }),
        removeTimer: (slug, timerId) => updateTimer(slug, timerId, () => null),
        acknowledge: (slug, timerId) =>
          updateTimer(slug, timerId, (timer) => ({
            ...timer,
            acknowledged: true,
          })),
        setKeepAwake: (keepAwake) => set({ keepAwake }),
      };
    },
    {
      name: "cuisine-pas-a-pas",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated by <TimerAlarm /> after the first render, to match the
      // server-rendered HTML.
      skipHydration: true,
      partialize: ({ sessions, keepAwake }) => ({ sessions, keepAwake }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<
          Pick<CookingState, "sessions" | "keepAwake">
        >;
        const limit = Date.now() - SESSION_TTL_MS;
        const sessions = Object.fromEntries(
          Object.entries(saved.sessions ?? {}).filter(
            ([, session]) => session.updatedAt > limit,
          ),
        );
        return {
          ...current,
          sessions,
          keepAwake: saved.keepAwake ?? current.keepAwake,
        };
      },
    },
  ),
);
