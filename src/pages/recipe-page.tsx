import { CookingView } from "@/components/cooking/cooking-view";
import { RecipeNotes } from "@/components/cooking/recipe-notes";
import { useLibrary } from "@/lib/library/store";
import { useDocumentTitle } from "@/lib/use-document-title";

import { NotFoundPage } from "./not-found-page";

export function RecipePage({ slug }: { slug: string }) {
  const entry = useLibrary((state) =>
    state.entries.find((item) => item.recipe.slug === slug),
  );
  const loading = useLibrary((state) => state.status === "loading");
  useDocumentTitle(entry?.recipe.title);

  if (!entry) return loading ? <RecipeSkeleton /> : <NotFoundPage />;
  return (
    <CookingView
      key={slug}
      recipe={entry.recipe}
      notes={<RecipeNotes recipe={entry.recipe} />}
    />
  );
}

function RecipeSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-4"
      aria-busy="true"
      aria-label="Chargement de la recette"
    >
      <div className="size-11 rounded-full bg-surface" />
      <div className="h-4 w-40 animate-pulse rounded bg-surface" />
      <div className="h-20 animate-pulse rounded-2xl bg-surface" />
      <div className="h-14 animate-pulse rounded-2xl bg-surface" />
      <div className="h-64 animate-pulse rounded-[22px] bg-surface" />
    </div>
  );
}
