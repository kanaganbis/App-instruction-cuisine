# Cuisine pas à pas

Une application locale pour cuisiner vos recettes **pas à pas** : instructions,
ingrédients et quantités réunis sur un seul fil, avec minuteurs intégrés.

Les recettes sont de simples fichiers **Markdown (`.md`)** rangés dans un dossier de
votre ordinateur. Pas de compte ni de base de données : l'application lit le dossier, et
votre progression (étape en cours, ingrédients cochés, minuteurs, portions) est gardée
dans le navigateur.

## Ce que fait l'application

- **Bibliothèque** : toutes les recettes du dossier, recherche par nom ou ingrédient
  (accents facultatifs), filtres par catégorie et étiquette, raccourci « En cours » pour
  reprendre une recette.
- **Mode cuisine** (proposition A, « Le Fil ») :
  - les quantités sont écrites **dans** les phrases des étapes ;
  - changer le nombre de portions recalcule toutes les quantités (grammes arrondis,
    fractions ½ ¼ ¾, pluriels accordés) ;
  - étapes faites repliées, étape en cours mise en avant, étapes suivantes lisibles ;
  - « Mise en place » : liste des ingrédients à cocher, par groupe ;
  - minuteurs : bouton par étape, et chaque durée du texte (« 15 min ») se touche
    pour lancer un minuteur. Ils continuent en fond, restent exacts après un
    rechargement et sonnent (son, vibration, notification) même depuis une autre page ;
  - écran maintenu allumé pendant la cuisine ;
  - sur grand écran, la mise en place reste affichée à gauche ;
  - thème sombre automatique, flèches ← → du clavier pour changer d'étape.

## Installation

Prérequis : [Node.js](https://nodejs.org) 20.9 ou plus récent.

```bash
npm install
```

## Utilisation

```bash
npm run cuisine
```

Cette commande prépare l'application puis la lance. Ouvrez ensuite
**http://localhost:3000** dans votre navigateur.

### Sur votre téléphone ou votre tablette

L'application écoute aussi sur votre réseau local. Au lancement, la ligne
`Network: http://192.168.x.x:3000` indique l'adresse à ouvrir depuis un téléphone
connecté au même Wi-Fi. Vous pouvez l'ajouter à l'écran d'accueil (menu du navigateur →
« Ajouter à l'écran d'accueil »).

Bon à savoir : la progression est enregistrée **par appareil**. Une recette commencée
sur le téléphone se reprend sur le téléphone.

### Choisir le dossier des recettes

Par défaut, l'application lit le dossier `recettes/` de ce projet. Pour utiliser un autre
dossier (par exemple un dossier synchronisé), copiez `.env.example` en `.env.local` et
indiquez son chemin :

```bash
RECETTES_DIR=/Users/moi/Documents/Recettes
```

Relancez ensuite l'application. Les sous-dossiers sont parcourus. Une recette ajoutée
ou modifiée apparaît au prochain chargement de la page, sans relancer quoi que ce soit.

## Écrire une recette

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
[`docs/instructions-projet-claude.md`](docs/instructions-projet-claude.md).

Pour contrôler un fichier :

```bash
npm run recettes:verifier -- recettes/ma-recette.md
```

## Développement

| Commande                      | Rôle                                                 |
| ----------------------------- | ---------------------------------------------------- |
| `npm run dev`                 | Serveur de développement (rechargement à chaud)      |
| `npm run build` / `npm start` | Construction puis lancement en production            |
| `npm run lint`                | ESLint                                               |
| `npm run typecheck`           | TypeScript strict                                    |
| `npm test`                    | Tests unitaires et de composants (Vitest)            |
| `npm run test:e2e`            | Tests de bout en bout (Playwright, mobile et bureau) |
| `npm run format`              | Mise en forme (Prettier)                             |
| `npm run check`               | Lint + types + tests + format                        |

Pile technique : Next.js 16 (App Router, Cache Components), React 19, TypeScript,
Tailwind CSS 4, Zustand (état de cuisine sauvegardé dans le navigateur), mdast (lecture
du Markdown), Vitest, Testing Library et Playwright. Le fonctionnement interne est
décrit dans [`CLAUDE.md`](CLAUDE.md).
