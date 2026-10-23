import { expect, test } from "@playwright/test";

test.describe("bibliothèque", () => {
  test("liste les recettes du dossier et filtre par recherche", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Que cuisine-t-on ?" }),
    ).toBeVisible();
    const recipes = page
      .getByRole("region", { name: "Recettes" })
      .getByRole("link");
    await expect(recipes).toHaveCount(2);

    await page
      .getByRole("searchbox", { name: "Rechercher une recette" })
      .fill("quinoa");
    await expect(recipes).toHaveCount(1);
    await expect(recipes.first()).toContainText("Saumon rôti");

    // Ingredients are searchable too, without accents.
    await page
      .getByRole("searchbox", { name: "Rechercher une recette" })
      .fill("epinards");
    await expect(recipes).toHaveCount(1);
    await expect(recipes.first()).toContainText("Curry");
  });
});

test.describe("mode cuisine", () => {
  test("suit la recette étape par étape et reprend où on s'était arrêté", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Curry de pois chiches/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /Curry de pois chiches/,
    );

    const current = page.getByRole("article");
    await expect(current).toContainText("Lancer le riz");
    await expect(current).toContainText("160 g de riz basmati complet");

    await current
      .getByRole("button", { name: "Lancer un minuteur de 25 min" })
      .click();
    const dock = page.getByRole("region", { name: "Minuteurs" });
    await expect(dock).toContainText("Lancer le riz");

    await current.getByRole("button", { name: "Étape terminée" }).click();
    await expect(page.getByRole("article")).toContainText(
      "Tailler les légumes",
    );
    await expect(page.getByText("Étape 2 sur 7")).toBeVisible();

    await page.getByRole("button", { name: "Plus de portions" }).click();
    await page.getByRole("button", { name: "Plus de portions" }).click();
    await expect(page.getByRole("article")).toContainText("3 gousses d'ail");

    await page.reload();
    await expect(page.getByText("Étape 2 sur 7")).toBeVisible();
    await expect(page.getByRole("article")).toContainText("3 gousses d'ail");
    await expect(page.getByRole("region", { name: "Minuteurs" })).toContainText(
      "Lancer le riz",
    );

    await page.getByRole("link", { name: "Retour aux recettes" }).click();
    await expect(page.getByRole("heading", { name: "En cours" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Curry de pois chiches.*Étape 2 sur 7/ }),
    ).toBeVisible();
  });

  test("une recette inconnue affiche une page dédiée", async ({ page }) => {
    await page.goto("/recettes/n-existe-pas");
    await expect(
      page.getByRole("heading", { name: /Cette recette n'existe pas/ }),
    ).toBeVisible();
  });
});
