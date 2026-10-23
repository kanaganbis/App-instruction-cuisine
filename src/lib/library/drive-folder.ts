export interface DriveFolder {
  id: string;
  /** Needed for folders shared by link before 2021. */
  resourceKey: string | null;
}

/**
 * Reads a Google Drive folder from its share link
 * (`https://drive.google.com/drive/folders/<id>?resourcekey=…`) or its bare id.
 */
export function parseDriveFolder(
  value: string | undefined | null,
): DriveFolder | null {
  const text = value?.trim();
  if (!text) return null;
  if (/^[\w-]{10,}$/.test(text)) return { id: text, resourceKey: null };
  try {
    const url = new URL(text);
    const fromPath = /\/folders\/([\w-]+)/.exec(url.pathname)?.[1];
    const id = fromPath ?? url.searchParams.get("id");
    if (!id) return null;
    return { id, resourceKey: url.searchParams.get("resourcekey") };
  } catch {
    return null;
  }
}
