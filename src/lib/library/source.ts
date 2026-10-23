export type RemoteFileKind = "markdown" | "google-doc" | "image";

/** A file of the recipes folder, wherever it is stored. */
export interface RemoteFile {
  id: string;
  /** Path inside the recipes folder, « desserts/tarte.md ». */
  path: string;
  kind: RemoteFileKind;
  /** Changes whenever the file is edited; used to reuse cached copies. */
  version: string;
}

/** Where the recipes come from: Google Drive, or a local folder while developing. */
export interface RecipeSource {
  /** Identifies the folder, so a cache from another folder is not reused. */
  id: string;
  /** Shown to the user, « Google Drive ». */
  label: string;
  list(signal?: AbortSignal): Promise<RemoteFile[]>;
  read(file: RemoteFile, signal?: AbortSignal): Promise<string>;
  imageUrl(file: RemoteFile): string;
}

/** A problem the user can act on, written for them. */
export class SourceError extends Error {
  constructor(
    message: string,
    readonly offline = false,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

export function isHidden(name: string): boolean {
  return name.startsWith(".") || name.startsWith("_");
}

const IGNORED = /^(readme|lisezmoi|license|licence|changelog)\.md$/i;

export function isRecipeFile(name: string): boolean {
  return /\.md$/i.test(name) && !IGNORED.test(name) && !isHidden(name);
}
