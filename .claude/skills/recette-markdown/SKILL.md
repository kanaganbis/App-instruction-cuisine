---
name: recette-markdown
description: Écrit, convertit ou corrige une recette de cuisine au format Markdown lu par l'application « Cuisine pas à pas » (en-tête YAML, ingrédients groupés, étapes avec {ingrédient} entre accolades, minuteurs ⏱, astuces). À utiliser dès qu'il faut ajouter une recette au dossier `recettes/`, transformer une recette copiée d'un site, d'un PDF, d'une photo ou d'une réponse du projet Claude « Rééquilibrage des recettes » en fichier .md, comprendre pourquoi une recette s'affiche mal (quantités absentes du texte, étape sans minuteur, ingrédient introuvable), ou adapter les instructions du projet Claude pour qu'il produise ce format — même si le mot « Markdown » n'est pas prononcé.
---

# Recette au format Markdown

L'application lit des fichiers `.md` dans un dossier Google Drive partagé par lien (en
développement : le dossier local `recettes/`) et affiche, pour chaque étape, le texte avec les quantités intégrées,
les ingrédients de l'étape et des minuteurs. Ce skill sert à produire des fichiers que
l'application comprend entièrement.

La référence complète du format est `docs/format-recette.md` ; un exemple qui utilise
toutes les possibilités est `recettes/curry-pois-chiches-patate-douce.md`. Lis-les si un
cas n'est pas couvert ci-dessous.

## Modèle

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

Une ou deux phrases de présentation.

## Ingrédients

### Légumes & herbes

- 1 oignon jaune
- 2 gousses d'ail
- 500 g de patate douce

### Épicerie

- 1 c. à soupe d'huile d'olive
- Sel, poivre

## Étapes

### Faire revenir

Chauffez {huile d'olive} dans une sauteuse. Faites revenir {oignon} 3 min, puis {ail} 1 min.

⏱ 4 min

> Astuce : restez près du feu, l'ail brûle vite.

## Pourquoi c'est équilibré

- …
```

## Règles, et pourquoi

- **Une ligne par ingrédient, quantité d'abord** (`160 g de riz`, `2 gousses d'ail`,
  `½ citron vert`). L'application en tire la quantité, l'unité et le nom pour recalculer
  selon les portions. Unités reconnues : g, kg, ml, cl, l, c. à soupe, c. à café,
  pincée, gousse, brin, tranche, boîte, sachet, pot, verre, botte, poignée, filet, noix.
  Une précision va après une virgule (`1 oignon, émincé`) ou entre parenthèses.
- **`portions` dans l'en-tête** : c'est la base du calcul. Les quantités de la liste
  correspondent à ce nombre.
- **Chaque ingrédient cité dans une étape s'écrit `{nom}`, sans quantité** :
  `Hachez {ail}` devient « Hachez **2 gousses d'ail** », et passe à 3 gousses si l'on
  choisit 6 portions. Écrire la quantité en dur dans la phrase la figerait. Le nom peut
  être abrégé (`{huile}`, `{tomates}`) s'il n'y a pas d'ambiguïté. Quand un ingrédient
  déjà utilisé revient plus tard (« ajoutez l'oignon »), écris-le sans accolades : il
  sera reconnu sans répéter sa quantité.
- **Une étape = une action**, avec un titre court à l'infinitif (`### Faire revenir`).
  Le titre sert de repère dans le fil des étapes et de nom aux minuteurs. 4 à 10 étapes.
- **Durées en clair dans le texte** (`laissez mijoter 15 min`) : elles deviennent des
  boutons minuteur. Ajoute `⏱ 25 min` sous l'étape quand l'attente n'apparaît pas dans
  la phrase (cuisson du riz, repos) ou pour fixer la durée totale de l'étape.
- **Astuces en citation** (`> Astuce : …`) : elles s'affichent à part, sans encombrer
  l'instruction.
- **Tout le reste dans des sections `##` après les étapes** (équilibre nutritionnel,
  conservation, variantes) : elles sont affichées telles quelles en fin de recette.
- **Nom de fichier** en minuscules avec tirets (`curry-pois-chiches.md`), extension
  `.md` : un fichier sans cette extension est ignoré. Un sous-dossier du dossier Drive
  sert de catégorie (`desserts/tarte-pommes.md`). Le chemin sert d'adresse et de clé de
  sauvegarde de la progression : évite de renommer un fichier pendant qu'une recette
  est en cours.
- **Enregistrement** : dépose le fichier dans le dossier Google Drive des recettes. Si
  un connecteur Google Drive est disponible, crée le fichier directement dans ce
  dossier, en texte brut (type `text/markdown`), sans le convertir en Google Doc.

## Convertir une recette existante

1. Récupère titre, portions, temps, ingrédients et étapes. N'invente aucune quantité :
   si une quantité manque, garde la ligne sans quantité (`Sel, poivre`) ou signale-le.
2. Regroupe les ingrédients s'il y a des sous-parties (pâte, garniture, sauce).
3. Découpe les étapes trop longues, donne-leur un titre, remplace chaque première
   mention d'ingrédient par `{nom}` et retire la quantité qui était écrite dans la phrase.
4. Garde les informations utiles hors étapes dans des sections `##` finales.

## Vérifier

Dans le dépôt de l'application, lance :

```bash
npm run recettes:verifier -- recettes/mon-fichier.md
```

Le résultat liste ce que l'application a compris (portions, nombre d'ingrédients,
étapes avec leurs ingrédients et minuteurs) et les remarques, par exemple un `{nom}` qui
ne correspond à aucun ingrédient. Corrige jusqu'à ne plus avoir de remarque, et vérifie
que chaque étape a bien les ingrédients attendus.
