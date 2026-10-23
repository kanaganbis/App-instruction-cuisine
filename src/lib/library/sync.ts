import { SourceError, type RecipeSource, type RemoteFile } from "./source";

export interface CachedRecipeFile extends RemoteFile {
  text: string;
}

/** Everything needed to show the library without network. */
export interface Snapshot {
  sourceId: string;
  syncedAt: number;
  recipes: CachedRecipeFile[];
  images: RemoteFile[];
}

export interface FileError {
  path: string;
  message: string;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index] as T);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

/**
 * Brings the cached recipes up to date: lists the folder, downloads only new
 * or modified files and forgets deleted ones. A file that fails to download
 * keeps its previous copy when there is one.
 */
export async function synchronize(
  source: RecipeSource,
  previous: Snapshot | null,
  options: { signal?: AbortSignal; now?: () => number } = {},
): Promise<{ snapshot: Snapshot; errors: FileError[] }> {
  const files = await source.list(options.signal);
  const cached = new Map(
    previous?.sourceId === source.id
      ? previous.recipes.map((file) => [file.id, file])
      : [],
  );
  const errors: FileError[] = [];

  const recipes = await mapLimit(
    files.filter((file) => file.kind !== "image"),
    6,
    async (file): Promise<CachedRecipeFile | null> => {
      const old = cached.get(file.id);
      if (old && old.version === file.version)
        return { ...old, path: file.path };
      try {
        return { ...file, text: await source.read(file, options.signal) };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          throw error;
        errors.push({
          path: file.path,
          message:
            error instanceof SourceError
              ? error.message
              : "Lecture impossible.",
        });
        return old ? { ...old, path: file.path } : null;
      }
    },
  );

  return {
    snapshot: {
      sourceId: source.id,
      syncedAt: (options.now ?? Date.now)(),
      recipes: recipes.filter(
        (file): file is CachedRecipeFile => file !== null,
      ),
      images: files.filter((file) => file.kind === "image"),
    },
    errors,
  };
}

const CACHE_KEY = "cuisine-pas-a-pas:recettes";
const CACHE_VERSION = 1;

export function loadSnapshot(sourceId: string): Snapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { version: number; snapshot: Snapshot };
    if (saved.version !== CACHE_VERSION || saved.snapshot.sourceId !== sourceId)
      return null;
    return saved.snapshot;
  } catch {
    return null;
  }
}

export function saveSnapshot(snapshot: Snapshot): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ version: CACHE_VERSION, snapshot }),
    );
  } catch {
    // Storage full or unavailable: the app still works online.
  }
}
