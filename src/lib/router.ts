import { useSyncExternalStore } from "react";

/*
 * Routes live in the address fragment (#/recettes/curry) so the app is a
 * single static file: no server has to know the routes.
 */

export type Route =
  | { name: "library" }
  | { name: "recipe"; slug: string }
  | { name: "not-found" };

export const href = {
  library: "#/",
  recipe: (slug: string) => `#/recettes/${encodeURIComponent(slug)}`,
};

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, "") || "/";
  if (path === "/") return { name: "library" };
  const recipe = /^\/recettes\/([^/]+)\/?$/.exec(path);
  if (recipe?.[1]) {
    try {
      return { name: "recipe", slug: decodeURIComponent(recipe[1]) };
    } catch {
      return { name: "not-found" };
    }
  }
  return { name: "not-found" };
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}
