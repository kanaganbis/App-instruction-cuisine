import { describe, expect, it, vi } from "vitest";

import { buildLibrary } from "./library";
import { SourceError, type RecipeSource, type RemoteFile } from "./source";
import { loadSnapshot, saveSnapshot, synchronize } from "./sync";

function source(
  files: RemoteFile[],
  texts: Record<string, string>,
): RecipeSource & { reads: string[] } {
  const reads: string[] = [];
  return {
    id: "drive:test",
    label: "Google Drive",
    reads,
    list: async () => files,
    read: async (file) => {
      reads.push(file.id);
      const text = texts[file.id];
      if (text === undefined)
        throw new SourceError("Lecture impossible du fichier.");
      return text;
    },
    imageUrl: (file) => `https://images/${file.id}`,
  };
}

const curry: RemoteFile = {
  id: "1",
  path: "curry.md",
  kind: "markdown",
  version: "v1",
};
const tarte: RemoteFile = {
  id: "2",
  path: "desserts/tarte.md",
  kind: "markdown",
  version: "v1",
};
const photo: RemoteFile = {
  id: "3",
  path: "desserts/photos/tarte.jpg",
  kind: "image",
  version: "v1",
};

describe("synchronize", () => {
  it("downloads everything the first time", async () => {
    const from = source([curry, tarte, photo], {
      "1": "# Curry",
      "2": "# Tarte",
    });
    const { snapshot, errors } = await synchronize(from, null, {
      now: () => 42,
    });
    expect(from.reads).toEqual(["1", "2"]);
    expect(snapshot).toMatchObject({
      sourceId: "drive:test",
      syncedAt: 42,
      images: [photo],
    });
    expect(snapshot.recipes.map((file) => file.text)).toEqual([
      "# Curry",
      "# Tarte",
    ]);
    expect(errors).toEqual([]);
  });

  it("only downloads files that changed and forgets deleted ones", async () => {
    const first = await synchronize(
      source([curry, tarte], { "1": "# Curry", "2": "# Tarte" }),
      null,
    );
    const changed = { ...curry, version: "v2" };
    const from = source([changed], { "1": "# Curry v2" });
    const { snapshot } = await synchronize(from, first.snapshot);
    expect(from.reads).toEqual(["1"]);
    expect(snapshot.recipes.map((file) => [file.path, file.text])).toEqual([
      ["curry.md", "# Curry v2"],
    ]);
  });

  it("keeps the previous copy of a file that cannot be read", async () => {
    const first = await synchronize(source([curry], { "1": "# Curry" }), null);
    const { snapshot, errors } = await synchronize(
      source([{ ...curry, version: "v2" }], {}),
      first.snapshot,
    );
    expect(snapshot.recipes[0]?.text).toBe("# Curry");
    expect(errors).toEqual([
      { path: "curry.md", message: "Lecture impossible du fichier." },
    ]);
  });

  it("does not reuse the cache of another folder", async () => {
    const first = await synchronize(source([curry], { "1": "# Ancien" }), null);
    const other = {
      ...source([curry], { "1": "# Nouveau" }),
      id: "drive:autre",
    };
    const { snapshot } = await synchronize(other, first.snapshot);
    expect(snapshot.recipes[0]?.text).toBe("# Nouveau");
  });
});

describe("snapshot cache", () => {
  it("saves and reloads the recipes for the same folder only", async () => {
    const { snapshot } = await synchronize(
      source([curry], { "1": "# Curry" }),
      null,
    );
    saveSnapshot(snapshot);
    expect(loadSnapshot("drive:test")).toEqual(snapshot);
    expect(loadSnapshot("drive:autre")).toBeNull();
  });

  it("survives a full or blocked storage", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });
    expect(() =>
      saveSnapshot({ sourceId: "x", syncedAt: 0, recipes: [], images: [] }),
    ).not.toThrow();
    spy.mockRestore();
  });
});

describe("buildLibrary", () => {
  it("parses recipes, derives slugs, categories and image addresses", async () => {
    const texts = {
      "1": "# Curry\n\n## Ingrédients\n- 1 oignon\n\n## Étapes\n1. Émincez l'oignon.",
      "2": "---\ntitre: Tarte aux pommes\nimage: photos/tarte.jpg\n---\n\n## Ingrédients\n- 3 pommes\n\n## Étapes\n1. Coupez les pommes.",
    };
    const from = source([curry, tarte, photo], texts);
    const { snapshot } = await synchronize(from, null);
    const entries = buildLibrary(snapshot, from);
    expect(
      entries.map((entry) => [
        entry.recipe.slug,
        entry.recipe.title,
        entry.recipe.meta.category,
      ]),
    ).toEqual([
      ["curry", "Curry", null],
      ["desserts-tarte", "Tarte aux pommes", "Desserts"],
    ]);
    expect(entries[1]?.summary.imageUrl).toBe("https://images/3");
    expect(entries[0]?.summary).toMatchObject({
      stepCount: 1,
      ingredientNames: ["oignon"],
    });
  });
});
