import type { DriveFolder } from "./drive-folder";
import {
  isHidden,
  isRecipeFile,
  SourceError,
  type RecipeSource,
  type RemoteFile,
} from "./source";

const API = "https://www.googleapis.com/drive/v3/files";
const FOLDER = "application/vnd.google-apps.folder";
const GOOGLE_DOC = "application/vnd.google-apps.document";
const MAX_FOLDERS = 200;

export interface DriveConfig {
  apiKey: string;
  folder: DriveFolder;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  resourceKey?: string;
}

interface DriveErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: { reason?: string }[];
  };
}

/** Turns a Google API error into something the cook can fix. */
function describeError(status: number, body: DriveErrorBody): string {
  const error = body.error;
  const reasons = [
    error?.status,
    ...(error?.errors ?? []).map((item) => item.reason),
  ].join(" ");
  const message = error?.message ?? "";
  if (
    /keyInvalid|API_KEY_INVALID/i.test(reasons) ||
    /API key not valid/i.test(message)
  ) {
    return "La clé d'API Google n'est pas valide. Vérifiez la valeur de GOOGLE_API_KEY.";
  }
  if (/referer|referrer/i.test(`${reasons} ${message}`)) {
    return "La clé d'API Google refuse cette adresse. Ajoutez l'adresse de l'application dans les restrictions de la clé (console Google Cloud).";
  }
  if (
    /accessNotConfigured|SERVICE_DISABLED/i.test(reasons) ||
    /has not been used|is disabled/i.test(message)
  ) {
    return "L'API Google Drive n'est pas activée dans le projet Google Cloud de la clé.";
  }
  if (/rateLimit|userRateLimit|dailyLimit|quota/i.test(reasons)) {
    return "Google Drive reçoit trop de demandes. Réessayez dans un instant.";
  }
  if (status === 404) {
    return "Dossier introuvable. Vérifiez le lien du dossier et qu'il est partagé avec « Tous les utilisateurs disposant du lien ».";
  }
  return `Google Drive a répondu par une erreur (${status}${message ? ` : ${message}` : ""}).`;
}

/** Reads recipes from a Google Drive folder shared by link, with an API key. */
export function createDriveSource(
  config: DriveConfig,
  fetchImpl: typeof fetch = fetch,
): RecipeSource {
  const resourceKeys = new Map<string, string>();
  if (config.folder.resourceKey)
    resourceKeys.set(config.folder.id, config.folder.resourceKey);

  async function call(
    url: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<Response> {
    const headers: Record<string, string> = {};
    const resourceKey = resourceKeys.get(id);
    if (resourceKey)
      headers["X-Goog-Drive-Resource-Keys"] = `${id}/${resourceKey}`;
    let response: Response;
    try {
      response = await fetchImpl(url, { headers, signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        throw error;
      throw new SourceError("Pas de connexion à Google Drive.", true);
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as DriveErrorBody;
      throw new SourceError(describeError(response.status, body));
    }
    return response;
  }

  const query = (params: Record<string, string>) =>
    new URLSearchParams({
      ...params,
      key: config.apiKey,
      supportsAllDrives: "true",
    }).toString();

  async function children(
    folderId: string,
    signal?: AbortSignal,
  ): Promise<DriveFile[]> {
    const files: DriveFile[] = [];
    let pageToken = "";
    do {
      const params = query({
        q: `'${folderId}' in parents and trashed = false`,
        fields:
          "nextPageToken,files(id,name,mimeType,modifiedTime,resourceKey)",
        pageSize: "1000",
        includeItemsFromAllDrives: "true",
        ...(pageToken ? { pageToken } : {}),
      });
      const response = await call(`${API}?${params}`, folderId, signal);
      const page = (await response.json()) as {
        files?: DriveFile[];
        nextPageToken?: string;
      };
      files.push(...(page.files ?? []));
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
    return files;
  }

  return {
    id: `drive:${config.folder.id}`,
    label: "Google Drive",

    async list(signal) {
      // A private folder would silently list nothing: check it first.
      const root = config.folder.id;
      const response = await call(
        `${API}/${root}?${query({ fields: "id,mimeType" })}`,
        root,
        signal,
      );
      const info = (await response.json()) as DriveFile;
      if (info.mimeType !== FOLDER) {
        throw new SourceError(
          "Le lien Google Drive configuré n'est pas celui d'un dossier.",
        );
      }

      const result: RemoteFile[] = [];
      const queue = [{ id: root, path: "" }];
      for (let visited = 0; queue.length && visited < MAX_FOLDERS; visited++) {
        const folder = queue.shift();
        if (!folder) break;
        for (const file of await children(folder.id, signal)) {
          if (isHidden(file.name)) continue;
          if (file.resourceKey) resourceKeys.set(file.id, file.resourceKey);
          const path = `${folder.path}${file.name}`;
          const version = file.modifiedTime ?? "";
          if (file.mimeType === FOLDER) {
            queue.push({ id: file.id, path: `${path}/` });
          } else if (file.mimeType === GOOGLE_DOC) {
            result.push({
              id: file.id,
              path: `${path}.md`,
              kind: "google-doc",
              version,
            });
          } else if (isRecipeFile(file.name)) {
            result.push({ id: file.id, path, kind: "markdown", version });
          } else if (file.mimeType.startsWith("image/")) {
            result.push({ id: file.id, path, kind: "image", version });
          }
        }
      }
      return result;
    },

    async read(file, signal) {
      const url =
        file.kind === "google-doc"
          ? `${API}/${file.id}/export?${query({ mimeType: "text/markdown" })}`
          : `${API}/${file.id}?${query({ alt: "media" })}`;
      const response = await call(url, file.id, signal);
      return response.text();
    },

    imageUrl(file) {
      return `${API}/${file.id}?${query({ alt: "media" })}`;
    },
  };
}
