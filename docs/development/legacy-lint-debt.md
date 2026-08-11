# Dette ESLint legacy

La CI Quality conserve les règles ESLint strictes pour tous les nouveaux
fichiers. Deux exceptions transitoires, définies explicitement dans
`eslint.config.mjs`, permettent de rendre la CI exploitable sans réécrire les
composants legacy :

- Les 48 fichiers `@ts-nocheck` mesurés par L06 le 2026-07-14 ne déclenchent
  pas `@typescript-eslint/ban-ts-comment`. Tout nouveau fichier reste bloqué
  par cette règle.
- Les diagnostics React Compiler déjà présents dans `page.tsx`, certaines vues
  athlètes et `CalendarPageOld.tsx` sont des avertissements ciblés. Les Rules
  of Hooks restent des erreurs; L12 ne doit pas introduire de nouvel écart.

Cette exception n'autorise ni nouveau `@ts-nocheck`, ni désactivation globale
de règle. Chaque retrait doit être fait avec le typage du fichier, ses tests
ciblés et la suppression de son entrée de la liste ESLint.

Ordre de résorption : helpers/API isolés, composants feuilles, slices athlète
et calendrier, puis `src/app/page.tsx`. Ce chantier suit la stratégie L06 et
sera planifié explicitement dans L13 avant toute suppression de l'exception.
