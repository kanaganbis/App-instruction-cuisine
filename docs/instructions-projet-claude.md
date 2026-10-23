# Instructions à ajouter au projet Claude « Rééquilibrage des recettes »

Pour que les recettes générées s'ouvrent directement dans l'application, copiez le
bloc ci-dessous **à la fin des instructions personnalisées du projet** (claude.ai →
Projets → Rééquilibrage des recettes → Instructions). Vos règles de rééquilibrage
restent inchangées : ce bloc ne décrit que la mise en forme.

Ensuite, enregistrez chaque recette produite dans un fichier `.md` du dossier Google
Drive des recettes (par exemple `curry-pois-chiches.md`). Elle apparaîtra dans
l'application à sa prochaine ouverture.

Si le connecteur **Google Drive** est activé dans Claude, ajoutez aussi la dernière règle
du bloc : Claude enregistrera lui-même la recette dans le dossier.

---

```text
FORMAT DE SORTIE DES RECETTES

Rends chaque recette finale dans un seul bloc de code Markdown, prêt à être enregistré
dans un fichier .md, en respectant exactement cette structure :

---
titre: <titre de la recette>
portions: <nombre>
preparation: <durée, ex. 15 min>
cuisson: <durée, ex. 30 min>
categorie: <Entrée | Plat complet | Dessert | Petit-déjeuner | …>
tags: [<étiquettes, ex. végétarien, sans gluten, rapide>]
---

# <titre de la recette>

<une ou deux phrases de présentation>

## Ingrédients

### <groupe, ex. Légumes & herbes>

- <quantité> <unité> de <ingrédient>, <précision éventuelle>

## Étapes

### <titre court de l'étape, verbe à l'infinitif>

<instructions de l'étape, en écrivant chaque ingrédient utilisé entre accolades : {nom}>

⏱ <durée>            (seulement si l'étape a un temps d'attente ou de cuisson)

> Astuce : <conseil> (facultatif)

## Pourquoi c'est équilibré

- <points clés du rééquilibrage>

Règles :
- Une ligne par ingrédient, quantité en chiffres (½, 1,5) et unités usuelles :
  g, kg, ml, cl, l, c. à soupe, c. à café, pincée, gousse, brin, tranche, boîte.
- Les quantités sont pour le nombre de portions indiqué dans l'en-tête.
- Dans les étapes, cite chaque ingrédient avec son nom entre accolades, sans quantité :
  « Faites revenir {oignon} dans {huile d'olive} ». L'application y insère la quantité.
- Le nom entre accolades doit correspondre à un ingrédient de la liste.
- Une étape = une action principale ; 4 à 10 étapes au total.
- Écris les durées en clair dans le texte (« laissez mijoter 15 min ») : elles deviennent
  des minuteurs.
- Les autres informations (valeurs nutritionnelles, conservation, variantes) vont dans
  des sections « ## » après les étapes.
- (Si le connecteur Google Drive est disponible) Quand je valide une recette, crée-la
  dans mon dossier Google Drive « Recettes » sous forme de fichier texte .md (pas de
  Google Doc), nommé d'après le titre en minuscules avec des tirets.
```
