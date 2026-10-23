import { TriangleAlert } from "lucide-react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import type { Recipe } from "@/lib/recipes/types";

const components: Components = {
  h1: ({ children }) => (
    <h3 className="font-display text-lg font-bold">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="font-display text-lg font-bold">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="font-display text-lg font-bold">{children}</h3>
  ),
  h4: ({ children }) => <h4 className="font-bold">{children}</h4>,
  p: ({ children }) => (
    <p className="leading-relaxed text-pretty">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-accent">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="flex list-decimal flex-col gap-1.5 pl-5 marker:text-muted">
      {children}
    </ol>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="font-semibold text-accent underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-line bg-inset px-3 py-2 font-bold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-line px-3 py-2 tabular-nums">{children}</td>
  ),
  img: () => null,
};

/** Other sections of the recipe (« Conseils », « Conservation »…) and reading problems. */
export function RecipeNotes({ recipe }: { recipe: Recipe }) {
  if (!recipe.notes.length && !recipe.warnings.length) return null;
  return (
    <div className="mt-6 flex flex-col gap-3">
      {recipe.notes.map((note) => (
        <section
          key={note.title}
          className="flex flex-col gap-3 rounded-[20px] bg-surface p-5"
        >
          <h2 className="font-display text-xl font-bold">{note.title}</h2>
          <div className="flex flex-col gap-3 text-[15px] text-ink-soft">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={components}
              skipHtml
            >
              {note.markdown}
            </Markdown>
          </div>
        </section>
      ))}

      {recipe.warnings.length > 0 && (
        <details className="group rounded-[20px] border border-dashed border-line-strong px-5 py-4 text-sm text-muted">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
            <TriangleAlert aria-hidden className="size-4 text-on-warm" />
            {recipe.warnings.length === 1
              ? "1 remarque sur le fichier"
              : `${recipe.warnings.length} remarques sur le fichier`}
          </summary>
          <p className="mt-3">
            Fichier :{" "}
            <code className="font-mono text-ink-soft">{recipe.file}</code>
          </p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            {recipe.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
