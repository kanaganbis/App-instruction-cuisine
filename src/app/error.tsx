"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Une erreur inattendue est survenue.";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-4 px-5">
      <p className="text-[13px] font-bold tracking-[0.08em] text-danger uppercase">
        Oups
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Quelque chose s&apos;est mal passé
      </h1>
      <p className="text-muted">{message}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="h-12 rounded-2xl bg-accent px-5 font-bold text-on-accent hover:bg-accent-hover"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="flex h-12 items-center rounded-2xl border border-line bg-surface px-5 font-bold"
        >
          Toutes les recettes
        </Link>
      </div>
    </main>
  );
}
