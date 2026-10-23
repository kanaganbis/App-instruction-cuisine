import { describe, expect, it } from "vitest";

import { href, parseRoute } from "./router";

describe("parseRoute", () => {
  it.each([
    ["", { name: "library" }],
    ["#/", { name: "library" }],
    ["#/recettes/curry", { name: "recipe", slug: "curry" }],
    [href.recipe("tarte-été"), { name: "recipe", slug: "tarte-été" }],
    ["#/recettes/%E0%A4%A", { name: "not-found" }],
    ["#/autre", { name: "not-found" }],
  ])("%s", (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });
});
