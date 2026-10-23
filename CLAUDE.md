# Cuisine pas à pas

Application web statique (un seul fichier HTML) qui lit des recettes Markdown dans un
dossier Google Drive partagé par lien et les affiche en mode cuisine « Le Fil » :
instructions, ingrédients et quantités sur un seul fil. Pas de serveur ni de base de
données : l'API Google Drive est appelée depuis le navigateur avec une clé d'API, les
recettes et l'état de cuisine sont gardés dans `localStorage`. L'interface et les
recettes sont en français.

## Commandes

- `npm run check` — lint, types, tests unitaires, format. À lancer avant chaque commit.
- `npm run dev` — serveur Vite. Sans `VITE_DRIVE_FOLDER`/`VITE_GOOGLE_API_KEY`, lit le
  dossier local `recettes/` via `scripts/vite-local-recipes.ts`.
- `npm run build` — produit `dist/index.html` (tout inclus : code, styles, polices) plus
  le manifeste, les icônes et `sw.js` copiés depuis `public/`.
- `npm test` — Vitest (parseur, formatage, client Drive, synchronisation, composants).
- `npm run test:e2e` — Playwright, projets `mobile` et `desktop`, sur le vrai build ;
  l'API Drive est simulée par `e2e/drive-mock.ts`. Si le Chromium de Playwright n'est
  pas installé, passer `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/chemin/vers/chromium`.
- `npm run recettes:verifier -- <fichier.md>` — ce que le parseur comprend d'une recette.

## Architecture

```
src/main.tsx, src/app.tsx  Entrée, routes (#/ et #/recettes/<slug>), rafraîchissement
src/config.ts             Choix de la source : Google Drive, dossier local (dev) ou rien
src/lib/recipes/          Domaine « recette », sans dépendance à React
  parse-recipe.ts         Markdown (mdast) → Recipe : sections, ingrédients, étapes, notes
  ingredient-line.ts      « 2 gousses d'ail, hachées » → quantité, unité, nom, précision
  quantity.ts, units.ts   Nombres (½, 1/2, « une »), plages, unités et alias
  duration.ts             Durées dans le texte, formatage des minuteurs
  mentions.ts             Ingrédients cités dans les étapes, résolution des {références}
  format.ts               Mise à l'échelle et formulation (« 3 gousses d'ail »)
src/lib/library/          Où sont les recettes
  drive.ts                Client API Drive v3 (clé d'API, dossier public, sous-dossiers)
  local-source.ts         Source de développement (dossier local servi par Vite)
  sync.ts                 Téléchargement des seuls fichiers modifiés, cache localStorage
  library.ts              Fichiers → recettes : slugs, catégories, adresses d'images
  store.ts                État de la bibliothèque (Zustand) : cache d'abord, puis synchro
src/lib/cooking/          État de cuisine (Zustand + persist), horloge, alarme, écran allumé
src/lib/router.ts         Routage par fragment d'URL (fichier statique unique)
src/components/           cooking/ (fil, mise en place, dock), library/, timers/
src/pages/                Bibliothèque, recette, introuvable
public/                   Manifeste, icônes, service worker (hors ligne, notifications)
```

## Points importants

- **Un seul fichier** : `vite-plugin-singlefile` inline tout dans `index.html`. Pas
  d'import dynamique de ressources externes ; les polices sont des fichiers locaux
  référencés dans `src/styles.css`.
- **Routage par `#`** : aucune réécriture d'URL côté hébergeur. Les liens utilisent
  `href.library` / `href.recipe(slug)`.
- **Google Drive** : le dossier doit être partagé « Tous les utilisateurs disposant du
  lien ». `drive.ts` vérifie d'abord le dossier (un dossier privé renverrait une liste
  vide) et traduit les erreurs de l'API en messages actionnables. La clé finit dans le
  HTML publié : elle doit être restreinte au site et à la Drive API.
- **Hors ligne** : `sync.ts` garde le texte des recettes dans `localStorage` et ne
  retélécharge que les fichiers dont `modifiedTime` a changé ; le service worker garde
  l'application elle-même.
- **Minuteurs** : basés sur des horodatages (`endsAt`), jamais sur un compteur
  décrémenté. Identifiant `step-<index>-<secondes>` partagé par le bouton d'étape et
  les durées du texte. Les notifications passent par le service worker (obligatoire sur
  Android).
- **Slugs** : dérivés du chemin du fichier dans le dossier ; ils servent de clé à la
  progression sauvegardée.
- **Le parseur ne lève pas d'erreur** : les problèmes vont dans `recipe.warnings`,
  affichés en bas de la recette. Toute évolution du format va avec des tests dans
  `src/lib/recipes/*.test.ts` et une mise à jour de `docs/format-recette.md`.
- **Sécurité** : le Markdown des notes est rendu sans HTML brut (`skipHtml`) ; seules
  les images `https` ou présentes dans le dossier Drive sont affichées.
- **Publication** : `.github/workflows/deploy.yml` publie sur GitHub Pages quand les
  variables de dépôt `DRIVE_FOLDER` et `GOOGLE_API_KEY` existent.

## Skills du projet

- `recette-markdown` — écrire ou convertir une recette dans le format de l'application.
- `design-cuisine` — jetons de design, composants et règles d'accessibilité de l'interface.
