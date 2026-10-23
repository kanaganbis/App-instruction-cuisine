# Propositions d'interface — suivre une recette pas à pas

Planche interactive (maquettes cliquables) : https://claude.ai/artifact/VCm35j6VJZPDDv1PU957Lm

Objectif : une seule interface qui réunit instructions, ingrédients, quantités et
étapes successives, lisible pendant la préparation.

## Principes communs aux trois propositions

- **Les quantités sont dans le texte de l'étape** : « Chauffez **1 c. à soupe d'huile
  d'olive** dans une sauteuse… ». Plus besoin de passer de la liste aux instructions.
- **Changer le nombre de portions** recalcule toutes les quantités, dans la liste
  comme dans les phrases.
- **Minuteurs intégrés aux étapes**, qui continuent de tourner en fond quand on passe à
  l'étape suivante (ex. le riz cuit pendant qu'on prépare le curry).
- **Écran toujours allumé** pendant la cuisine.
- Grandes zones tactiles (≥ 44 px), texte lisible de loin.

## A · Le Fil (téléphone)

Toute la recette sur un fil vertical : étapes terminées repliées, étape en cours mise
en avant (texte, ingrédients de l'étape, minuteur, bouton « Étape terminée »), étapes
suivantes lisibles à l'avance. Mise en place repliable en haut, minuteurs actifs dans
une barre flottante en bas.

- Points forts : vue d'ensemble permanente, on peut lire la suite.
- Compromis : il faut faire défiler, texte plus petit que B.

## B · Focus (téléphone, thème sombre)

Une étape à la fois, en très grand : numéro, « Il vous faut » (ingrédients de l'étape à
cocher), instruction en gros caractères, gros minuteur. Commence par un écran
« Mise en place ». Boutons Précédent / Suivant en bas, à portée du pouce. Bouton « Aa »
pour agrandir encore le texte.

- Points forts : le plus lisible de loin, zéro distraction.
- Compromis : on voit moins la recette dans son ensemble.

## C · Plan de travail (tablette paysage)

Deux colonnes : à gauche la liste complète des ingrédients, **synchronisée avec
l'étape en cours** (ingrédients de l'étape surlignés, ingrédients déjà utilisés barrés) ;
à droite l'étape en cours en grand, son minuteur et un aperçu de l'étape suivante.
Frise des 7 étapes en haut, minuteurs en fond en bas.

- Points forts : tout est visible sans rien toucher, idéal tablette posée sur le plan
  de travail.
- Compromis : demande une tablette, moins adapté au téléphone.

## Suite

La proposition A a été retenue et développée. Les recettes sont des fichiers
Markdown : voir [`format-recette.md`](format-recette.md) et le [README](../README.md).
