import { BellRing } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { formatClock } from "@/lib/recipes/duration";
import { useNow } from "@/lib/cooking/hooks";
import { notify, playChime, vibrate } from "@/lib/cooking/sound";
import { timerStatus, useCookingStore } from "@/lib/cooking/store";
import { href } from "@/lib/router";

const RING_EVERY_MS = 2500;
const RING_FOR_MS = 3 * 60 * 1000;

/** Watches every timer of every recipe and rings when one finishes, on any page. */
export function TimerAlarm() {
  const sessions = useCookingStore((state) => state.sessions);
  const acknowledge = useCookingStore((state) => state.acknowledge);

  useEffect(() => {
    // Keep several tabs in sync.
    const onStorage = (event: StorageEvent) => {
      if (event.key === useCookingStore.persist.getOptions().name) {
        void useCookingStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pending = useMemo(
    () =>
      Object.entries(sessions).flatMap(([slug, session]) =>
        session.timers
          .filter((timer) => !timer.acknowledged)
          .map((timer) => ({ slug, timer })),
      ),
    [sessions],
  );
  const now = useNow(pending.length > 0);

  const ringing = pending.filter(
    ({ timer }) => timerStatus(timer, now).status === "done",
  );
  const ringingKey = ringing
    .map(({ slug, timer }) => `${slug}/${timer.id}`)
    .join("|");

  const announced = useRef(new Set<string>());
  useEffect(() => {
    const keys = ringingKey ? ringingKey.split("|") : [];
    // Forget stopped timers so a restarted one notifies again.
    announced.current = new Set(
      [...announced.current].filter((key) => keys.includes(key)),
    );
    if (!keys.length) return;
    const fresh = ringing.filter(
      ({ slug, timer }) => !announced.current.has(`${slug}/${timer.id}`),
    );
    keys.forEach((key) => announced.current.add(key));
    if (document.hidden) {
      fresh.forEach(({ timer }) =>
        notify(
          "C'est prêt !",
          `${timer.label} — ${timer.recipeTitle}`,
          timer.id,
        ),
      );
    }

    const startedAt = Date.now();
    const ring = () => {
      if (Date.now() - startedAt > RING_FOR_MS) return;
      playChime();
      vibrate();
    };
    ring();
    const interval = setInterval(ring, RING_EVERY_MS);
    const title = document.title;
    document.title = `⏰ ${title}`;
    return () => {
      clearInterval(interval);
      document.title = title;
    };
    // `ringing` is described by `ringingKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringingKey]);

  if (!ringing.length) return null;

  const stopAll = () =>
    ringing.forEach(({ slug, timer }) => acknowledge(slug, timer.id));

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div
        role="alert"
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-3xl bg-dock p-2 pl-4 text-on-dock shadow-[0_18px_40px_-12px_rgb(0_0_0/0.5)]"
      >
        <BellRing
          aria-hidden
          className="size-6 shrink-0 animate-ring text-dock-accent"
        />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-bold">C&apos;est prêt !</p>
          <ul className="text-sm text-dock-muted">
            {ringing.map(({ slug, timer }) => (
              <li key={`${slug}/${timer.id}`} className="truncate">
                <a
                  href={href.recipe(slug)}
                  className="underline-offset-2 hover:underline"
                >
                  {timer.label}
                </a>{" "}
                · {formatClock(timer.durationMs / 1000)}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={stopAll}
          className="h-11 shrink-0 rounded-2xl bg-dock-accent px-4 font-bold text-[#2b1800] hover:brightness-105"
        >
          Arrêter
        </button>
      </div>
    </div>
  );
}
