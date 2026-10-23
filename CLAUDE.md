# Cuisine pas à pas

Application locale (Next.js) qui lit des recettes Markdown dans un dossier et les affiche
en mode cuisine « Le Fil » : instructions, ingrédients et quantités sur un seul fil.
Pas de base de données : les fichiers sont lus à chaque requête, l'état de cuisine vit
dans `localStorage`. L'interface et les recettes sont en français.

@AGENTS.md

## Commandes

- `npm run check` — lint, types, tests unitaires, format. À lancer avant chaque commit.
- `npm test` — Vitest (parseur, formatage, composant de cuisine).
- `npm run test:e2e` — Playwright, projets `mobile` et `desktop`, sur les recettes de
  `e2e/recettes/`. Si le Chromium de Playwright n'est pas installé, passer
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/chemin/vers/chromium`.
- `npm run recettes:verifier -- <fichier.md>` — ce que le parseur comprend d'une recette.
- `npm run build && npx next start -p 3200` — version de production pour des captures.

## Architecture

```
src/lib/recipes/        Domaine « recette », sans dépendance à React ni Next
  parse-recipe.ts       Markdown (mdast) → Recipe : sections, ingrédients, étapes, notes
  ingredient-line.ts    « 2 gousses d'ail, hachées » → quantité, unité, nom, précision
  quantity.ts, units.ts Nombres (½, 1/2, « une »), plages, unités et alias
  duration.ts           Durées dans le texte, formatage des minuteurs
  mentions.ts           Ingrédients cités dans les étapes, résolution des {références}
  format.ts             Mise à l'échelle et formulation (« 3 gousses d'ail »)
  repository.ts         Lecture du dossier (server-only), cache par date de modification
src/lib/cooking/        État de cuisine côté navigateur
  store.ts              Zustand + persist : étape, portions, cases cochées, minuteurs
  hooks.ts              useHydrated, useSession, useNow (horloge partagée)
  use-wake-lock.ts      Écran allumé (Wake Lock API, repli NoSleep.js en http)
  sound.ts              Alarme Web Audio, vibration, notifications
src/components/cooking/ Écran de cuisine (fil des étapes, mise en place, dock)
src/components/library/ Bibliothèque (recherche, filtres, cartes)
src/app/                Routes : / , /recettes/[slug], /api/images/[slug]
```

## Points importants

- **Next 16 avec Cache Components** : la lecture des fichiers se fait dans des
  composants serveur enveloppés dans `<Suspense>` pour rester dynamique (une recette
  ajoutée apparaît au rechargement). Lire `node_modules/next/dist/docs/` avant
  d'utiliser une API Next (voir AGENTS.md).
- **Hydratation** : le store Zustand utilise `skipHydration` ; `TimerAlarm` (dans le
  layout) appelle `rehydrate()`. Tout rendu qui dépend de l'état de cuisine attend
  `useHydrated()` et montre un squelette avant.
- **Minuteurs** : basés sur des horodatages (`endsAt`), jamais sur un compteur
  décrémenté, pour rester justes en arrière-plan et après rechargement. Identifiant
  `step-<index>-<secondes>` partagé par le bouton d'étape et les durées du texte.
- **Slugs** : dérivés du chemin du fichier ; ils servent de clé à la progression
  sauvegardée.
- **Le parseur ne lève pas d'erreur** : les problèmes vont dans `recipe.warnings`,
  affichés en bas de la recette. Toute évolution du format va avec des tests dans
  `src/lib/recipes/*.test.ts` et une mise à jour de `docs/format-recette.md`.
- **Sécurité** : `/api/images/[slug]` ne sert que des images situées dans le dossier des
  recettes ; le Markdown des notes est rendu sans HTML brut (`skipHtml`).

## Skills du projet

- `recette-markdown` — écrire ou convertir une recette dans le format de l'application.
- `design-cuisine` — jetons de design, composants et règles d'accessibilité de l'interface.
