import { ChevronLeft } from "lucide-react";

import { href } from "@/lib/router";
import { useDocumentTitle } from "@/lib/use-document-title";

export function NotFoundPage() {
  useDocumentTitle("Recette introuvable");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-4 px-5">
      <p className="text-[13px] font-bold tracking-[0.08em] text-accent uppercase">
        Introuvable
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Cette recette n&apos;existe pas (ou plus)
      </h1>
      <p className="text-muted">
        Le fichier a peut-être été renommé ou déplacé dans le dossier des
        recettes.
      </p>
      <a
        href={href.library}
        className="flex h-12 items-center gap-2 self-start rounded-2xl bg-accent px-5 font-bold text-on-accent hover:bg-accent-hover"
      >
        <ChevronLeft aria-hidden className="size-5" />
        Toutes les recettes
      </a>
    </main>
  );
}
