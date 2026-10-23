# Format des fichiers recette (.md)

L'application lit des fichiers Markdown simples. Le format est **tolérant** : une
recette écrite « normalement » s'affiche déjà correctement. Les éléments ci-dessous
permettent d'aller plus loin (quantités dans le texte des étapes, minuteurs, astuces).

Un exemple complet : [`recettes/curry-pois-chiches-patate-douce.md`](../recettes/curry-pois-chiches-patate-douce.md).

## Structure

```markdown
---
titre: Curry de pois chiches, patate douce & épinards
portions: 4
preparation: 15 min
cuisson: 30 min
categorie: Plat complet
tags: [végétarien, sans gluten]
---

# Curry de pois chiches, patate douce & épinards

Une phrase de présentation (facultative).

## Ingrédients

### Légumes & herbes

- 1 oignon jaune
- 2 gousses d'ail

### Épicerie

- 160 g de riz basmati complet
- 1 c. à soupe d'huile d'olive
- Sel, poivre

## Étapes

### Lancer le riz

Rincez {riz} à l'eau froide, puis faites-le cuire à couvert.

⏱ 25 min

> Astuce : il cuit tout seul pendant que vous préparez le curry.

### Faire revenir

Chauffez {huile d'olive} et faites revenir {oignon} 3 min.

## Pourquoi c'est équilibré

Toute autre section s'affiche à la fin de la recette.
```

## En-tête (facultatif)

Bloc YAML entre deux lignes `---`, tout en haut du fichier.

| Clé           | Exemple                 | Rôle                                               |
| ------------- | ----------------------- | -------------------------------------------------- |
| `titre`       | `Curry de pois chiches` | Titre (sinon : le titre `#`, sinon le fichier)     |
| `portions`    | `4`                     | Base du calcul quand on change les portions        |
| `preparation` | `15 min`                | Temps de préparation                               |
| `cuisson`     | `30 min`, `1 h 15`      | Temps de cuisson                                   |
| `repos`       | `2 h`                   | Temps de repos                                     |
| `categorie`   | `Plat complet`          | Filtre de la bibliothèque                          |
| `tags`        | `[végétarien, rapide]`  | Filtres et recherche                               |
| `image`       | `photos/curry.jpg`      | Photo (chemin relatif au fichier, ou URL)          |
| `description` | `Un curry doux…`        | Présentation (sinon : le paragraphe sous le titre) |

Les clés anglaises (`title`, `servings`, `category`…) fonctionnent aussi.

Sans en-tête, l'application lit des lignes comme
`**Portions** : 2 | **Préparation** : 10 min | **Cuisson** : 20 min` ou `Pour 4 personnes`.

## Ingrédients

- Une section dont le titre contient « Ingrédients ».
- Un ingrédient par ligne de liste : `quantité unité nom, précision`.
- Groupes : sous-titres `###`, ligne en gras (`**Pâte**`) ou ligne terminée par `:`.

Quantités comprises : `2`, `1,5`, `½`, `1/2`, `1 ½`, `2 à 3`, `une`, `une demi`.
Unités comprises : `g`, `kg`, `ml`, `cl`, `l`, `c. à soupe` (`cs`, `càs`), `c. à café`
(`cc`, `càc`), `pincée`, `gousse`, `brin`, `tranche`, `boîte`, `sachet`, `pot`,
`verre`, `botte`, `poignée`, `filet`, `noix`… Sans quantité (`Sel, poivre`),
l'ingrédient est affiché tel quel.

## Étapes

- Une section dont le titre contient « Étapes », « Préparation » ou « Instructions ».
- Trois façons d'écrire les étapes :
  1. un sous-titre `###` par étape (le sous-titre devient le titre de l'étape) ;
  2. une liste numérotée, avec le titre en gras : `1. **Cuire le quinoa** : rincez…` ;
  3. de simples paragraphes.

### Quantités dans le texte : `{ingrédient}`

Écrivez le nom d'un ingrédient entre accolades : il est remplacé par sa quantité,
recalculée selon les portions choisies.

`Hachez {ail}` → « Hachez **2 gousses d'ail** » (ou « **3 gousses d'ail** » pour 6 portions).

Le nom peut être abrégé (`{huile}` pour « huile d'olive »), sans accents ni pluriel exact.
Un nom qui ne correspond à aucun ingrédient est signalé en bas de la recette.

Sans accolades, les ingrédients cités dans le texte sont quand même reconnus et
listés dans « Pour cette étape », mais sans quantité dans la phrase.

### Minuteurs

- Les durées du texte (`15 min`, `1 h 30`, `30 secondes`, `10 à 15 minutes`) deviennent
  des boutons minuteur.
- Une ligne `⏱ 25 min` (ou `Minuteur : 25 min`) fixe le minuteur principal de l'étape,
  utile quand la durée n'apparaît pas dans la phrase.

### Astuces

Une citation (`> Astuce : …`) ou une ligne commençant par `Astuce :` ou `Conseil :`
s'affiche sous l'étape avec une ampoule.

## Autres sections

Toute autre section (`## Conseils`, `## Conservation`, `## Valeurs nutritionnelles`…)
s'affiche telle quelle à la fin de la recette (listes, gras, tableaux compris).

## Organisation du dossier

- Les sous-dossiers sont parcourus ; le nom du sous-dossier sert de catégorie si la
  recette n'en précise pas.
- Les fichiers et dossiers commençant par `.` ou `_`, ainsi que `README.md`, sont ignorés.
- L'adresse d'une recette vient du chemin du fichier : renommer un fichier remet sa
  progression à zéro.
