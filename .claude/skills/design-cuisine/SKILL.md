---
name: design-cuisine
description: Système de design et conventions d'interface de l'application « Cuisine pas à pas » (proposition A « Le Fil » : fond sauge, typo Bricolage Grotesque + Figtree, pastilles de quantité, fil des étapes, dock des minuteurs). À utiliser avant toute modification visuelle ou nouvel écran de l'application : nouveau composant, changement de couleur, de typographie ou de mise en page, mode sombre, accessibilité, version tablette, ou quand on demande que l'interface reste « cohérente », « jolie » ou « lisible en cuisine ».
---

# Design « Le Fil »

L'application sert pendant qu'on cuisine : mains occupées, téléphone posé à 50 cm,
lumière variable. Chaque choix vise à lire vite et à toucher juste. Garde cette
intention en tête plutôt que d'appliquer les règles mécaniquement.

## Jetons (src/app/globals.css)

Les couleurs sont des variables CSS sémantiques exposées à Tailwind
(`bg-ground`, `text-muted`, `bg-accent`…). Le mode sombre redéfinit les mêmes
variables : **n'écris jamais de couleur en dur** dans un composant, sinon elle ne
suivra pas le thème sombre.

| Rôle                   | Classe                                           | Usage                                         |
| ---------------------- | ------------------------------------------------ | --------------------------------------------- |
| Fond de page           | `bg-ground`                                      | Vert sauge très pâle                          |
| Cartes                 | `bg-surface`, `shadow-card`                      | Étape en cours, mise en place, cartes recette |
| Zones en retrait       | `bg-inset`                                       | Pastilles « Pour cette étape », boutons ±     |
| Texte                  | `text-ink`, `text-ink-soft`, `text-muted`        | Principal, secondaire, légendes               |
| Action principale      | `bg-accent` + `text-on-accent`                   | « Étape terminée », étape faite               |
| Quantité dans le texte | `bg-accent-soft` + `text-on-accent-soft`         | `{ingrédient}` de l'étape en cours            |
| Quantité à venir       | `bg-mention` + `text-on-mention`                 | Étapes suivantes, plus discrètes              |
| Temps et minuteurs     | `bg-warm`/`text-on-warm`, `bg-warm-strong`       | Tout ce qui touche au temps (orange safran)   |
| Dock des minuteurs     | `bg-dock`, `text-dock-muted`, `text-dock-accent` | Barre flottante en bas                        |

Règle de sens : **vert = ingrédients et avancement, safran = temps**. Ne mélange pas.

## Typographie

- `font-display` (Bricolage Grotesque) : titres de recette, d'étape, de section,
  chiffres du dock. Gras, `tracking-tight`.
- `font-sans` (Figtree) : tout le reste. Instruction de l'étape en cours en
  `text-lg leading-[1.62]` : c'est le texte qu'on lit de loin, ne le réduis pas.
- Chiffres alignés : `tabular-nums` sur les quantités et les minuteurs.
- Les polices sont servies localement (`next/font/local` + paquets `@fontsource`) :
  l'application doit fonctionner sans internet.

## Composants (src/components)

- `cooking/step-timeline.tsx` : le fil. Étapes faites repliées (« Revoir »), étape en
  cours en carte (`rounded-[22px]`), étapes suivantes lisibles et cliquables, nœuds de
  34 px reliés par un rail de 2 px.
- `cooking/inline-text.tsx` : rendu du texte d'étape ; quantités en pastilles, durées en
  boutons minuteur, ingrédients reconnus soulignés.
- `cooking/prep-checklist.tsx` : mise en place repliable sur téléphone, toujours ouverte
  dans la colonne de gauche à partir de `lg`.
- `cooking/timer-dock.tsx`, `timers/timer-alarm.tsx` : minuteurs et alarme.
- `library/*` : bibliothèque (recherche, filtres, « En cours », cartes).

Réutilise ces composants et leurs rayons (`rounded-2xl` contrôles, `rounded-[20px]`
sections, `rounded-[22px]` cartes principales) avant d'en créer de nouveaux.

## Interaction et accessibilité

- Cibles tactiles de **44 px minimum** (`size-11`, `h-11`) ; actions principales en
  52–56 px de haut.
- Vrais éléments : `<button>`, `<a>`/`Link`, `<input>` + `<label>`. `aria-pressed` pour
  les bascules, `aria-label` sur les boutons à icône seule, icônes `aria-hidden`.
- Contraste ≥ 4,5:1 dans les deux thèmes ; vérifie aussi en mode sombre.
- Icônes : `lucide-react`, trait cohérent, jamais d'emoji dans l'interface.
- Animations sobres et respectant `prefers-reduced-motion` (déjà géré globalement).
- L'état de cuisine vient du navigateur après le premier rendu : tout ce qui en dépend
  passe par `useHydrated()` et affiche un squelette avant, pour éviter les sauts.

## Mise en page

- Mobile d'abord : colonne unique `max-w-2xl`, marges `px-5`, place réservée en bas
  pour le dock (`pb-44`) et les zones sûres (`env(safe-area-inset-*)`).
- À partir de `lg` : mise en place collante à gauche (21rem), fil à droite.
- Texte en français, ton direct et chaleureux, verbes à l'impératif dans les étapes.

## Vérifier visuellement

Après une modification visuelle : `npm run build && npx next start -p 3200`, puis
captures Playwright en `Pixel 7` et en bureau 1366×900, thème clair **et** sombre
(`colorScheme: "dark"`). Regarde-les avant de conclure : débordements horizontaux,
textes coupés, contraste, alignement des quantités.
