import { useSyncExternalStore } from "react";

import { emptySession, useCookingStore, type CookingSession } from "./store";

const EMPTY = emptySession();

export function useSession(slug: string): CookingSession {
  return useCookingStore((state) => state.sessions[slug] ?? EMPTY);
}

/* A single shared clock, ticking only while a component needs it. */
let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribeClock(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, 250);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const noop = () => () => {};

/** Current time, refreshed four times a second while `active`. */
export function useNow(active = true): number {
  return useSyncExternalStore(
    active ? subscribeClock : noop,
    () => {
      if (!active) return 0;
      now ||= Date.now();
      return now;
    },
    () => 0,
  );
}
