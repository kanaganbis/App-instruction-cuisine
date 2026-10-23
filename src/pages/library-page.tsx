import {
  FolderOpen,
  RefreshCw,
  Soup,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { LibraryBrowser } from "@/components/library/library-browser";
import { refreshLibrary, useLibrary } from "@/lib/library/store";
import { useDocumentTitle } from "@/lib/use-document-title";
import { cn } from "@/lib/utils";

const time = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});
const dayAndTime = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function formatSync(timestamp: number): string {
  const date = new Date(timestamp);
  return new Date().toDateString() === date.toDateString()
    ? `aujourd'hui à ${time.format(date)}`
    : `le ${dayAndTime.format(date)}`;
}

export function LibraryPage() {
  useDocumentTitle(null);
  const { status, entries, error, syncing, syncedAt, sourceLabel, fileErrors } =
    useLibrary(useShallow((state) => state));
  const recipes = useMemo(
    () => entries.map((entry) => entry.summary),
    [entries],
  );

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

      {status === "unconfigured" && <SetupNotice />}
      {status === "loading" && <LibrarySkeleton />}
      {status === "error" && error && (
        <Notice
          icon={error.offline ? WifiOff : TriangleAlert}
          title="Impossible de lire les recettes"
        >
          <p className="text-ink-soft">{error.message}</p>
          <RetryButton syncing={syncing} />
        </Notice>
      )}

      {status === "ready" && (
        <>
          {error && (
            <div
              role="status"
              className="mt-6 flex items-start gap-3 rounded-2xl bg-warm px-4 py-3 text-on-warm"
            >
              {error.offline ? (
                <WifiOff aria-hidden className="mt-0.5 size-5 shrink-0" />
              ) : (
                <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
              )}
              <p className="flex-1 text-sm font-semibold">
                {error.offline
                  ? `Hors connexion : voici les recettes enregistrées ${syncedAt ? formatSync(syncedAt) : ""}.`
                  : error.message}
              </p>
            </div>
          )}

          {recipes.length > 0 ? (
            <LibraryBrowser recipes={recipes} />
          ) : (
            <Notice icon={FolderOpen} title="Aucune recette pour l'instant">
              <p className="text-ink-soft">
                Déposez vos fichiers de recettes (.md) dans le dossier{" "}
                {sourceLabel ?? ""} partagé, puis actualisez.
              </p>
              <RetryButton syncing={syncing} label="Actualiser" />
            </Notice>
          )}

          <footer className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-sm text-muted">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2">
                <FolderOpen aria-hidden className="size-4 shrink-0" />
                <span>
                  {recipes.length} recette{recipes.length > 1 ? "s" : ""} ·{" "}
                  {sourceLabel}
                  {syncedAt ? ` · mise à jour ${formatSync(syncedAt)}` : ""}
                </span>
              </p>
              <RetryButton syncing={syncing} label="Actualiser" quiet />
            </div>
            {fileErrors.length > 0 && (
              <div className="flex items-start gap-2 text-danger">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <ul>
                  {fileErrors.map((fileError) => (
                    <li key={fileError.path}>
                      <code className="font-mono">{fileError.path}</code> :{" "}
                      {fileError.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </footer>
        </>
      )}
    </main>
  );
}

function RetryButton({
  syncing,
  label = "Réessayer",
  quiet = false,
}: {
  syncing: boolean;
  label?: string;
  quiet?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => void refreshLibrary()}
      disabled={syncing}
      className={cn(
        "flex h-11 items-center gap-2 self-start rounded-2xl px-4 font-bold disabled:opacity-60",
        quiet
          ? "text-accent hover:bg-inset"
          : "bg-accent text-on-accent hover:bg-accent-hover",
      )}
    >
      <RefreshCw
        aria-hidden
        className={cn("size-4", syncing && "animate-spin")}
      />
      {syncing ? "Mise à jour…" : label}
    </button>
  );
}

function Notice({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FolderOpen;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 flex flex-col gap-4 rounded-[22px] bg-surface p-6 shadow-card sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Icon aria-hidden className="size-6" />
      </span>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function SetupNotice() {
  return (
    <Notice
      icon={FolderOpen}
      title="L'application n'est pas encore reliée à Google Drive"
    >
      <p className="text-ink-soft">
        Il manque la clé d&apos;accès Google qui permet de lire le dossier des
        recettes.
      </p>
      <p className="text-sm text-muted">
        Créez la variable <code className="font-mono">GOOGLE_API_KEY</code> dans
        les réglages du dépôt GitHub (ou{" "}
        <code className="font-mono">VITE_GOOGLE_API_KEY</code> dans{" "}
        <code className="font-mono">.env.local</code>), puis republiez
        l&apos;application. La marche à suivre est dans le README.
      </p>
    </Notice>
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
            className="h-60 animate-pulse rounded-[22px] bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
