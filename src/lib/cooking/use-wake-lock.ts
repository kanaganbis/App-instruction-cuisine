import type NoSleep from "nosleep.js";
import { useEffect, useSyncExternalStore } from "react";

export type WakeLockStatus = "inactive" | "active" | "unavailable";

/* The lock lives outside React: one per page, whatever renders it. */
let status: WakeLockStatus = "inactive";
let sentinel: WakeLockSentinel | null = null;
let fallback: NoSleep | null = null;
const listeners = new Set<() => void>();

function setStatus(next: WakeLockStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((notify) => notify());
}

const hasNativeLock = () =>
  typeof navigator !== "undefined" &&
  "wakeLock" in navigator &&
  window.isSecureContext;

async function acquire(): Promise<void> {
  try {
    if (hasNativeLock()) {
      if (sentinel && !sentinel.released) return;
      sentinel = await navigator.wakeLock.request("screen");
      sentinel.addEventListener("release", () => setStatus("inactive"));
    } else {
      if (fallback?.isEnabled) return;
      const { default: NoSleepClass } = await import("nosleep.js");
      fallback ??= new NoSleepClass();
      await fallback.enable();
    }
    setStatus("active");
  } catch {
    setStatus("unavailable");
  }
}

function release(): void {
  void sentinel?.release().catch(() => {});
  sentinel = null;
  fallback?.disable();
  setStatus("inactive");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Keeps the screen on while `wanted`. Uses the Screen Wake Lock API, and on
 * pages served over plain http (a phone opening the app on the local network)
 * falls back to NoSleep.js, which needs a tap to start.
 */
export function useWakeLock(wanted: boolean): {
  status: WakeLockStatus;
  activate: () => void;
} {
  const current = useSyncExternalStore(
    subscribe,
    () => status,
    () => "inactive" as const,
  );

  useEffect(() => {
    if (!wanted) return;
    // The native lock needs no gesture; the fallback waits for the first tap.
    if (hasNativeLock()) void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible" && hasNativeLock())
        void acquire();
    };
    const onGesture = () => void acquire();
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("click", onGesture, { once: true });
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("click", onGesture);
      release();
    };
  }, [wanted]);

  return { status: current, activate: () => void acquire() };
}
