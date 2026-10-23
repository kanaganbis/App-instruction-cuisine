# Cuisine pas à pas

Une application pour cuisiner vos recettes **pas à pas** sur téléphone ou tablette :
instructions, ingrédients et quantités réunis sur un seul fil, avec minuteurs intégrés.

- Les recettes sont des fichiers **Markdown (`.md`)** rangés dans un **dossier Google Drive**.
- L'application est **un seul fichier HTML** publié à une adresse web : rien à installer
  sur un ordinateur, rien à laisser allumé.
- Chaque téléphone garde sa progression (étape en cours, portions, cases cochées,
  minuteurs) et une copie des recettes pour fonctionner sans réseau.

## Ce que fait l'application

- **Bibliothèque** : toutes les recettes du dossier Drive (sous-dossiers compris),
  recherche par nom ou ingrédient (accents facultatifs), filtres par catégorie et
  étiquette, raccourci « En cours » pour reprendre une recette.
- **Mode cuisine** (proposition A, « Le Fil ») :
  - les quantités sont écrites **dans** les phrases des étapes ;
  - changer le nombre de portions recalcule toutes les quantités (grammes arrondis,
    fractions ½ ¼ ¾, pluriels accordés) ;
  - étapes faites repliées, étape en cours mise en avant, étapes suivantes lisibles ;
  - « Mise en place » : liste des ingrédients à cocher, par groupe ;
  - minuteurs : un bouton par étape, et chaque durée du texte (« 15 min ») se touche
    pour lancer un minuteur. Ils restent justes après un rechargement et sonnent
    (son, vibration, notification) sur toutes les pages ;
  - écran maintenu allumé, thème sombre automatique.
- **Mises à jour** : une recette ajoutée ou modifiée dans Drive apparaît à la prochaine
  ouverture de l'application (ou avec le bouton « Actualiser »).

## Mise en route (une seule fois)

### 1. Le dossier Google Drive

1. Dans Google Drive, créez un dossier, par exemple **Recettes**.
2. Clic droit › **Partager** › Accès général : **Tous les utilisateurs disposant du lien**,
   rôle **Lecteur**.
3. **Copier le lien** : c'est la valeur de `DRIVE_FOLDER`.

Toute personne qui obtient ce lien (ou l'adresse de l'application) peut lire les
recettes : n'y mettez rien de confidentiel.

### 2. La clé d'accès Google (gratuite)

1. Ouvrez [console.cloud.google.com](https://console.cloud.google.com/) et créez un
   projet (par exemple « Cuisine pas à pas »).
2. **API et services › Bibliothèque** : cherchez **Google Drive API** › **Activer**.
3. **API et services › Identifiants › Créer des identifiants › Clé API**. Copiez-la :
   c'est la valeur de `GOOGLE_API_KEY`.
4. Cliquez sur la clé pour la **restreindre** (recommandé) :
   - Restrictions relatives aux applications : **Sites Web**, ajoutez l'adresse de
     l'application suivie de `*` (par exemple `https://kanaganbis.github.io/*`) ;
   - Restrictions relatives aux API : **Google Drive API** uniquement.

### 3. Publier l'application

L'application doit être publiée à une adresse **https** pour que les téléphones l'ouvrent,
l'installent et gardent l'écran allumé. Deux solutions gratuites :

**A. GitHub Pages (le plus simple)** — nécessite un dépôt **public** (ou un compte
GitHub Pro). Le code ne contient aucun secret et vos recettes restent dans Drive.

1. Dépôt GitHub › **Settings › General** › tout en bas, « Change visibility » › **Public**.
2. **Settings › Pages** › Source : **GitHub Actions**.
3. **Settings › Secrets and variables › Actions › onglet Variables** › créez
   `DRIVE_FOLDER` (le lien du dossier) et `GOOGLE_API_KEY` (la clé).
4. Fusionnez la pull request dans `main` (ou lancez **Actions › Publication › Run
   workflow**). L'adresse s'affiche à la fin : `https://kanaganbis.github.io/App-instruction-cuisine/`.

**B. Netlify ou Cloudflare Pages (dépôt privé)** — créez un site relié au dépôt GitHub
avec : commande de build `npm run build`, dossier publié `dist`, variables
d'environnement `VITE_DRIVE_FOLDER` et `VITE_GOOGLE_API_KEY`.

Pensez à ajouter l'adresse obtenue dans les restrictions de la clé (étape 2.4).

### 4. Sur chaque téléphone

Ouvrez l'adresse de l'application, puis :

- **Android (Chrome)** : menu ⋮ › **Ajouter à l'écran d'accueil** (ou « Installer l'application ») ;
- **iPhone (Safari)** : bouton Partager › **Sur l'écran d'accueil**.

L'application a alors son icône et s'ouvre en plein écran, même sans réseau.

## Ajouter une recette

Déposez un fichier `.md` dans le dossier Drive (depuis l'ordinateur, ou avec l'application
Google Drive du téléphone : **+ › Importer**). Les sous-dossiers servent de catégories.
Un Google Doc fonctionne aussi, mais un fichier `.md` est plus fiable.

Le format est décrit dans [`docs/format-recette.md`](docs/format-recette.md). En bref :

```markdown
---
titre: Curry de pois chiches
portions: 4
preparation: 15 min
cuisson: 30 min
---

# Curry de pois chiches

## Ingrédients

- 2 gousses d'ail
- 1 c. à soupe d'huile d'olive

## Étapes

### Faire revenir

Chauffez {huile d'olive} et faites revenir {ail} 1 min.
```

`{ail}` est remplacé par « 2 gousses d'ail », recalculé selon les portions.

Pour que votre projet Claude « Rééquilibrage des recettes » produise directement ce
format, ajoutez à ses instructions le texte de
[`docs/instructions-projet-claude.md`](docs/instructions-projet-claude.md). Si le
connecteur Google Drive est activé dans Claude, il peut même enregistrer la recette
directement dans le dossier.

Pour contrôler un fichier avant de le déposer :

```bash
npm run recettes:verifier -- ma-recette.md
```

## Développement

Prérequis : [Node.js](https://nodejs.org) 20.19 ou plus récent, puis `npm install`.

Sans configuration, `npm run dev` lit les recettes du dossier local `recettes/`. Pour
travailler sur votre vrai dossier Drive, copiez `.env.example` en `.env.local` et
renseignez `VITE_DRIVE_FOLDER` et `VITE_GOOGLE_API_KEY`.

| Commande                    | Rôle                                                 |
| --------------------------- | ---------------------------------------------------- |
| `npm run dev`               | Serveur de développement (aussi sur le réseau local) |
| `npm run build`             | Construit `dist/index.html`, l'application complète  |
| `npm run preview`           | Sert la version construite                           |
| `npm run lint`              | ESLint                                               |
| `npm run typecheck`         | TypeScript strict                                    |
| `npm test`                  | Tests unitaires et de composants (Vitest)            |
| `npm run test:e2e`          | Tests de bout en bout (Playwright, mobile et bureau) |
| `npm run recettes:verifier` | Ce que l'application comprend des recettes           |
| `npm run check`             | Lint + types + tests + format                        |

Pile technique : React 19, TypeScript, Vite (sortie en un seul fichier avec
`vite-plugin-singlefile`), Tailwind CSS 4, Zustand, mdast pour lire le Markdown, API
Google Drive v3, Vitest, Testing Library et Playwright. Le fonctionnement interne est
décrit dans [`CLAUDE.md`](CLAUDE.md).
