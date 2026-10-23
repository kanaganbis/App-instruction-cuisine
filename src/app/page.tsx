import { FolderOpen, Soup, TriangleAlert } from "lucide-react";
import { Suspense } from "react";

import { LibraryBrowser } from "@/components/library/library-browser";
import { getLibrary } from "@/lib/recipes/repository";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 pt-8 pb-16 sm:px-8">
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-[13px] font-bold tracking-[0.08em] text-accent uppercase">
          <Soup aria-hidden className="size-4" />
          Cuisine pas à pas
        </p>
        <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">
          Que cuisine-t-on ?
        </h1>
      </header>
      <Suspense fallback={<LibrarySkeleton />}>
        <Library />
      </Suspense>
    </main>
  );
}

// Reads the recipes folder at each visit: new or edited files appear on reload.
async function Library() {
  const library = await getLibrary();

  if (!library.dirExists || !library.recipes.length) {
    return <EmptyLibrary dir={library.dir} missing={!library.dirExists} />;
  }

  return (
    <>
      <LibraryBrowser recipes={library.recipes} />
      <footer className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-sm text-muted">
        <p className="flex items-start gap-2">
          <FolderOpen aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            {library.recipes.length} recette
            {library.recipes.length > 1 ? "s" : ""} lue
            {library.recipes.length > 1 ? "s" : ""} dans{" "}
            <code className="font-mono break-all text-ink-soft">
              {library.dir}
            </code>
          </span>
        </p>
        {library.errors.length > 0 && (
          <div className="flex items-start gap-2 text-danger">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <ul>
              {library.errors.map((error) => (
                <li key={error.file}>
                  <code className="font-mono">{error.file}</code> :{" "}
                  {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </footer>
    </>
  );
}

function EmptyLibrary({ dir, missing }: { dir: string; missing: boolean }) {
  return (
    <section className="mt-10 flex flex-col gap-4 rounded-[22px] bg-surface p-6 shadow-card sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <FolderOpen aria-hidden className="size-6" />
      </span>
      <h2 className="font-display text-2xl font-bold">
        {missing
          ? "Le dossier des recettes est introuvable"
          : "Aucune recette pour l'instant"}
      </h2>
      <p className="text-ink-soft">
        {missing
          ? "L'application cherche vos recettes dans :"
          : "Déposez vos fichiers Markdown (.md) dans :"}
      </p>
      <code className="rounded-xl bg-inset px-4 py-3 font-mono text-sm break-all">
        {dir}
      </code>
      <p className="text-sm text-muted">
        Pour utiliser un autre dossier, indiquez son chemin dans la variable{" "}
        <code className="font-mono">RECETTES_DIR</code> du fichier{" "}
        <code className="font-mono">.env.local</code>, puis relancez
        l&apos;application. Le format des fichiers est décrit dans{" "}
        <code className="font-mono">docs/format-recette.md</code>.
      </p>
    </section>
  );
}

function LibrarySkeleton() {
  return (
    <div
      className="mt-8 flex flex-col gap-6"
      aria-busy="true"
      aria-label="Chargement des recettes"
    >
      <div className="h-14 animate-pulse rounded-2xl bg-surface" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-72 animate-pulse rounded-[22px] bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
