import { readFileSync } from "node:fs";
import path from "node:path";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useCookingStore } from "@/lib/cooking/store";
import { parseRecipe } from "@/lib/recipes/parse-recipe";

import { CookingView } from "./cooking-view";

const recipe = parseRecipe(
  readFileSync(
    path.join(process.cwd(), "recettes/curry-pois-chiches-patate-douce.md"),
    "utf8",
  ),
  { slug: "curry", file: "curry.md" },
);

async function renderView() {
  const user = userEvent.setup();
  render(<CookingView recipe={recipe} />);
  await act(() => useCookingStore.persist.rehydrate());
  return user;
}

const currentStep = () => screen.getByRole("article");

describe("CookingView", () => {
  beforeEach(() => {
    useCookingStore.setState({ sessions: {}, keepAwake: false });
  });

  it("shows the current step with its quantities in the text", async () => {
    await renderView();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Curry de pois chiches",
    );
    expect(
      within(currentStep()).getByText("160 g de riz basmati complet"),
    ).toBeInTheDocument();
    expect(screen.getByText("Étape 1 sur 7")).toBeInTheDocument();
  });

  it("scales every quantity with the servings", async () => {
    const user = await renderView();
    await user.click(screen.getByRole("button", { name: "Plus de portions" }));
    await user.click(screen.getByRole("button", { name: "Plus de portions" }));
    expect(
      within(currentStep()).getByText("240 g de riz basmati complet"),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 gousses d'ail/)).toBeInTheDocument();
  });

  it("moves through the steps and remembers progress", async () => {
    const user = await renderView();
    await user.click(screen.getByRole("button", { name: "Étape terminée" }));
    expect(
      within(currentStep()).getByRole("heading", {
        name: "Tailler les légumes",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Lancer le riz/ }),
    ).toHaveTextContent("Revoir");

    const saved = JSON.parse(localStorage.getItem("cuisine-pas-a-pas") ?? "{}");
    expect(saved.state.sessions.curry.currentStep).toBe(1);

    await user.click(screen.getByRole("button", { name: /Lancer le riz/ }));
    expect(
      within(currentStep()).getByRole("heading", { name: "Lancer le riz" }),
    ).toBeInTheDocument();
  });

  it("ticks ingredients in the mise en place", async () => {
    const user = await renderView();
    // The phone layout's list lives in <main>; wide screens show a copy beside it.
    const main = within(screen.getByRole("main"));
    await user.click(main.getByRole("button", { name: /Mise en place/ }));
    const garlic = main.getByRole("button", { name: /2 gousses ail/ });
    await user.click(garlic);
    expect(garlic).toHaveAttribute("aria-pressed", "true");
    expect(main.getByText("1 sur 15 ingrédients prêts")).toBeInTheDocument();
  });

  it("starts a timer and shows it in the dock", async () => {
    const user = await renderView();
    await user.click(
      within(currentStep()).getByRole("button", {
        name: "Lancer un minuteur de 25 min",
      }),
    );
    const dock = screen.getByRole("region", { name: "Minuteurs" });
    expect(within(dock).getByText("Lancer le riz")).toBeInTheDocument();
    expect(
      within(dock).getByRole("button", {
        name: "Mettre en pause : Lancer le riz",
      }),
    ).toBeInTheDocument();
  });
});
