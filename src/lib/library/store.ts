import { create } from "zustand";

import { buildLibrary, type LibraryEntry } from "./library";
import { SourceError, type RecipeSource } from "./source";
import {
  loadSnapshot,
  saveSnapshot,
  synchronize,
  type FileError,
  type Snapshot,
} from "./sync";

export type LibraryStatus = "unconfigured" | "loading" | "ready" | "error";

interface LibraryState {
  status: LibraryStatus;
  entries: LibraryEntry[];
  sourceLabel: string | null;
  syncing: boolean;
  syncedAt: number | null;
  /** Last synchronisation problem. Shown as a banner when cached recipes exist. */
  error: { message: string; offline: boolean } | null;
  fileErrors: FileError[];
}

export const useLibrary = create<LibraryState>()(() => ({
  status: "loading",
  entries: [],
  sourceLabel: null,
  syncing: false,
  syncedAt: null,
  error: null,
  fileErrors: [],
}));

let source: RecipeSource | null = null;
let snapshot: Snapshot | null = null;
let running: Promise<void> | null = null;

/** Shows the cached recipes at once, then brings them up to date. */
export function startLibrary(from: RecipeSource | null): Promise<void> {
  source = from;
  if (!from) {
    useLibrary.setState({ status: "unconfigured" });
    return Promise.resolve();
  }
  snapshot = loadSnapshot(from.id);
  useLibrary.setState({
    sourceLabel: from.label,
    ...(snapshot
      ? {
          status: "ready",
          entries: buildLibrary(snapshot, from),
          syncedAt: snapshot.syncedAt,
        }
      : { status: "loading" }),
  });
  return refreshLibrary();
}

export function refreshLibrary(): Promise<void> {
  const from = source;
  if (!from) return Promise.resolve();
  running ??= (async () => {
    useLibrary.setState({ syncing: true });
    try {
      const result = await synchronize(from, snapshot);
      snapshot = result.snapshot;
      saveSnapshot(result.snapshot);
      useLibrary.setState({
        status: "ready",
        entries: buildLibrary(result.snapshot, from),
        syncedAt: result.snapshot.syncedAt,
        error: null,
        fileErrors: result.errors,
      });
    } catch (error) {
      const known = error instanceof SourceError;
      useLibrary.setState({
        status: snapshot ? "ready" : "error",
        error: {
          message: known
            ? error.message
            : "Une erreur inattendue est survenue en lisant les recettes.",
          offline: known && error.offline,
        },
      });
    } finally {
      useLibrary.setState({ syncing: false });
      running = null;
    }
  })();
  return running;
}
