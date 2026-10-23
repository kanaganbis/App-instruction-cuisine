import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CookingView } from "@/components/cooking/cooking-view";
import { RecipeNotes } from "@/components/cooking/recipe-notes";
import { getRecipe } from "@/lib/recipes/repository";

export async function generateMetadata({
  params,
}: PageProps<"/recettes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipe(slug);
  return {
    title: recipe?.title ?? "Recette introuvable",
    description: recipe?.description ?? undefined,
  };
}

export default function RecipePage({ params }: PageProps<"/recettes/[slug]">) {
  return (
    <Suspense fallback={<RecipeSkeleton />}>
      <Recipe params={params} />
    </Suspense>
  );
}

// The file is read at each visit, so edits to the Markdown show up on reload.
async function Recipe({
  params,
}: Pick<PageProps<"/recettes/[slug]">, "params">) {
  const { slug } = await params;
  const recipe = await getRecipe(slug);
  if (!recipe) notFound();
  return (
    <CookingView recipe={recipe} notes={<RecipeNotes recipe={recipe} />} />
  );
}

function RecipeSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-4"
      aria-busy="true"
      aria-label="Chargement"
    >
      <div className="size-11 rounded-full bg-surface" />
      <div className="h-4 w-40 animate-pulse rounded bg-surface" />
      <div className="h-20 animate-pulse rounded-2xl bg-surface" />
      <div className="h-14 animate-pulse rounded-2xl bg-surface" />
      <div className="h-64 animate-pulse rounded-[22px] bg-surface" />
    </div>
  );
}
