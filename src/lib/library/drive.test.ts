import { describe, expect, it, vi } from "vitest";

import { createDriveSource } from "./drive";
import { parseDriveFolder } from "./drive-folder";
import { SourceError } from "./source";

const FOLDER = "application/vnd.google-apps.folder";

interface FakeFile {
  id: string;
  name: string;
  mimeType: string;
  parent: string;
  modifiedTime?: string;
}

/** A tiny Google Drive: answers files.get, files.list and alt=media like the real API. */
function fakeDrive(files: FakeFile[], contents: Record<string, string> = {}) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url.pathname + url.search);
    if (url.searchParams.get("key") !== "cle") {
      return Response.json(
        { error: { code: 400, message: "API key not valid." } },
        { status: 400 },
      );
    }
    const [, id, action] =
      /\/drive\/v3\/files(?:\/([^/]+))?(?:\/(export))?$/.exec(url.pathname) ??
      [];
    if (!id) {
      const parent = /'([^']+)' in parents/.exec(
        url.searchParams.get("q") ?? "",
      )?.[1];
      return Response.json({
        files: files.filter((file) => file.parent === parent),
      });
    }
    if (id === "racine") return Response.json({ id, mimeType: FOLDER });
    if (url.searchParams.get("alt") === "media" || action === "export") {
      return new Response(contents[id] ?? "", {
        status: id in contents ? 200 : 404,
      });
    }
    return Response.json(
      { error: { code: 404, message: "File not found" } },
      { status: 404 },
    );
  });
  return { fetch: fetchMock as unknown as typeof fetch, calls };
}

const config = { apiKey: "cle", folder: { id: "racine", resourceKey: null } };

describe("parseDriveFolder", () => {
  it("reads share links and bare ids", () => {
    expect(
      parseDriveFolder(
        "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMn?usp=sharing",
      ),
    ).toEqual({ id: "1AbCdEfGhIjKlMn", resourceKey: null });
    expect(
      parseDriveFolder(
        "https://drive.google.com/drive/u/0/folders/1AbCdEfGhIjKlMn?resourcekey=0-xyz",
      ),
    ).toEqual({ id: "1AbCdEfGhIjKlMn", resourceKey: "0-xyz" });
    expect(parseDriveFolder("1AbCdEfGhIjKlMn")).toEqual({
      id: "1AbCdEfGhIjKlMn",
      resourceKey: null,
    });
    expect(parseDriveFolder("")).toBeNull();
    expect(parseDriveFolder("pas un lien")).toBeNull();
  });
});

describe("createDriveSource", () => {
  const files: FakeFile[] = [
    {
      id: "a",
      name: "curry.md",
      mimeType: "text/markdown",
      parent: "racine",
      modifiedTime: "t1",
    },
    { id: "d", name: "desserts", mimeType: FOLDER, parent: "racine" },
    {
      id: "b",
      name: "tarte.md",
      mimeType: "application/octet-stream",
      parent: "d",
      modifiedTime: "t2",
    },
    { id: "p", name: "tarte.jpg", mimeType: "image/jpeg", parent: "d" },
    {
      id: "g",
      name: "Gratin",
      mimeType: "application/vnd.google-apps.document",
      parent: "racine",
    },
    { id: "x", name: "notes.txt", mimeType: "text/plain", parent: "racine" },
    { id: "r", name: "README.md", mimeType: "text/markdown", parent: "racine" },
    { id: "h", name: "_brouillons", mimeType: FOLDER, parent: "racine" },
    { id: "z", name: "cache.md", mimeType: "text/markdown", parent: "h" },
  ];

  it("lists recipes, sub-folders and images, skipping other files", async () => {
    const drive = fakeDrive(files);
    const source = createDriveSource(config, drive.fetch);
    const listed = await source.list();
    expect(listed.map((file) => [file.path, file.kind])).toEqual([
      ["curry.md", "markdown"],
      ["Gratin.md", "google-doc"],
      ["desserts/tarte.md", "markdown"],
      ["desserts/tarte.jpg", "image"],
    ]);
    expect(listed[0]?.version).toBe("t1");
  });

  it("downloads files and exports Google Docs as Markdown", async () => {
    const drive = fakeDrive(files, { a: "# Curry", g: "# Gratin" });
    const source = createDriveSource(config, drive.fetch);
    const [curry, gratin] = await source.list();
    expect(await source.read(curry!)).toBe("# Curry");
    expect(await source.read(gratin!)).toBe("# Gratin");
    expect(
      drive.calls.some(
        (call) =>
          call.startsWith("/drive/v3/files/a?") && call.includes("alt=media"),
      ),
    ).toBe(true);
    expect(
      drive.calls.some((call) => call.startsWith("/drive/v3/files/g/export?")),
    ).toBe(true);
    expect(
      source.imageUrl({
        id: "p",
        path: "tarte.jpg",
        kind: "image",
        version: "",
      }),
    ).toBe(
      "https://www.googleapis.com/drive/v3/files/p?alt=media&key=cle&supportsAllDrives=true",
    );
  });

  it("explains a wrong key, a missing folder and a lost connection", async () => {
    const drive = fakeDrive(files);
    await expect(
      createDriveSource({ ...config, apiKey: "mauvaise" }, drive.fetch).list(),
    ).rejects.toThrow(/clé d'API Google n'est pas valide/);
    await expect(
      createDriveSource(
        { ...config, folder: { id: "inconnu", resourceKey: null } },
        drive.fetch,
      ).list(),
    ).rejects.toThrow(/Dossier introuvable/);

    const offline = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const error = await createDriveSource(config, offline)
      .list()
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(SourceError);
    expect((error as SourceError).offline).toBe(true);
  });

  it("sends the resource key of folders shared before 2021", async () => {
    const drive = fakeDrive([]);
    await createDriveSource(
      { ...config, folder: { id: "racine", resourceKey: "0-abc" } },
      drive.fetch,
    ).list();
    const init = (drive.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1] as RequestInit;
    expect(init.headers).toEqual({
      "X-Goog-Drive-Resource-Keys": "racine/0-abc",
    });
  });
});
