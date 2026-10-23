import { useEffect } from "react";

import { TimerAlarm } from "@/components/timers/timer-alarm";
import { createRecipeSource } from "@/config";
import { refreshLibrary, startLibrary, useLibrary } from "@/lib/library/store";
import { useRoute } from "@/lib/router";
import { LibraryPage } from "@/pages/library-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { RecipePage } from "@/pages/recipe-page";

const REFRESH_AFTER_MS = 60_000;

export function App() {
  const route = useRoute();

  useEffect(() => {
    void startLibrary(createRecipeSource());
    // Coming back to the app after a while: look for new or edited recipes.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const { syncedAt } = useLibrary.getState();
      if (!syncedAt || Date.now() - syncedAt > REFRESH_AFTER_MS)
        void refreshLibrary();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const page = route.name === "recipe" ? `recipe/${route.slug}` : route.name;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <>
      {route.name === "library" && <LibraryPage />}
      {route.name === "recipe" && <RecipePage slug={route.slug} />}
      {route.name === "not-found" && <NotFoundPage />}
      <TimerAlarm />
    </>
  );
}
