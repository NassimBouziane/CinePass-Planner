# Conception : Mode Builder Interactif et Notes Allociné

**Date :** 16 octobre 2026  
**Auteur :** Nassim Bouzidi & Antigravity  
**Statut :** Prêt pour approbation  

---

## 1. Contexte & Intention

CinéPass Planner permet d'optimiser automatiquement un marathon de 2 à 3 films selon 4 scénarios prédéfinis. Cependant, certains cinéphiles ont une contrainte forte : ils veulent **composer leur journée autour d'un film ou d'une séance spécifique**, tout en bénéficiant de suggestions avant ou après, et en gardant la liberté de choisir manuellement chaque film créneau par créneau.

De plus, pour guider le choix lors de la planification, les utilisateurs ont besoin des **notes Allociné (spectateurs et presse)** affichées sous forme de badges compacts haute visibilité et rafraîchies quotidiennement par script.

---

## 2. Objectifs, Non-Objectifs & Anti-Objectifs

### Objectifs
1. **Mode Builder interactif & modulaire :**
   - **Bouton Header :** Active le mode builder et ouvre un tiroir de sélection du film initial, avec les films favoris/coups de cœur affichés en tête de liste.
   - **Bouton "Bâtir" devant chaque film :** Présent sur la liste des films priorités et sur les cartes de séances, il sélectionne directement ce film et démarre le builder avec cette séance en créneau 1.
   - **Déplacement et décalage intelligent :** L'utilisateur peut modifier la position d'un film ($1^{er} \rightarrow 2^e$). L'ancien film $2$ passe en position $3$ (s'il reste compatible au niveau des horaires), et le créneau $1$ devenu vacant est recalculé automatiquement par l'algorithme.
   - **Tiroir coulissant d'alternatives (Bottom-sheet tactile) :** Sur n'importe quel créneau, l'utilisateur peut cliquer pour afficher toutes les séances réelles compatibles dans ses cinémas cochés, triées chronologiquement après la séance précédente, et remplacer le film en 1 clic.
   - **Ticket thermique synchronisé :** Le récapitulatif thermique (durée totale, pause réelle, suppléments IMAX/4DX) s'actualise en direct.
2. **Notes Allociné (Presse & Spectateurs) :**
   - Script Python autonome `scripts/refresh_ratings.py` exécutable quotidiennement (ou en CLI via `cinepass refresh-ratings`) mettant à jour `web/public/data/ratings.json`.
   - Badges graphiques Variante 1 (fond pastel jaune `#FFE566` avec étoile noire pour spectateurs, fond lavande `#C4B5FD` avec icône journal pour presse, texte 100% noir encre `#111111` à fort contraste). Si une note presse est absente, seul le badge spectateur s'affiche sans créer de vide disgracieux.

### Non-Objectifs
- Remplacer les 4 scénarios automatiques (optimal, même cinéma, pauses courtes, coups de cœur) : le builder coexiste en tant que mode dédié.
- Marathons de plus de 4 films (la plage reste de 2 à 4 films).
- Scraping en direct dans le navigateur : respect absolu de l'architecture serverless statique GitHub Pages via `ratings.json`.

### Anti-Objectifs
- **Zéro emoji système** : uniquement des icônes vectorielles SVG noir d'encre `#111111` avec touches pastel.
- **Pas de dégradation mobile** : le sélecteur d'alternatives utilise un tiroir vertical glissant depuis le bas (bottom-sheet) au lieu d'une modale tronquée.
- **Pas de texte blanc sur fond pastel** : contraste rigoureux et bordures 2px `#111111` sans flou.

---

## 3. Architecture Technique & Flux de Données

```
+-------------------------------------------------------------------+
|               PIPELINE PYTHON & CRON QUOTIDIEN                    |
|                                                                   |
|   Allociné Search (/rechercher/movie/?q=...)                      |
|                |                                                  |
|                v                                                  |
|   scripts/refresh_ratings.py (mise en cache TTL 7 jours)          |
|                |                                                  |
|                v                                                  |
|   web/public/data/ratings.json (titre -> {press, user, updated})  |
+-------------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------+
|               APPLICATION FRONTEND ASTRO / TS                     |
|                                                                   |
|   1. Chargement au démarrage : ratings.json + showtimes-<date>.json |
|   2. Header : Bouton "Mode Builder"                               |
|   3. Badges Allociné : Badge.ts (Spectateurs + Presse)            |
|   4. Mode Builder Core :                                          |
|      - scheduler.ts : findMarathonsAroundPinned(...)              |
|      - scheduler.ts : getAvailableCandidatesForSlot(...)          |
|      - Gestion des décalages d'ordre (1->2->3)                    |
|   5. UI Builder (index.astro) :                                   |
|      - Panneau dédié central "Builder de Marathon"                |
|      - Créneaux ordonnés avec connecteurs de pause/transit        |
|      - Tiroir coulissant (Drawer) pour explorer les alternatives  |
|      - Synchronisation du ticket thermique                        |
+-------------------------------------------------------------------+
```

---

## 4. Spécifications Détaillées

### 4.1. Module Allociné & Script de Rafraîchissement
- **Stockage :** `web/public/data/ratings.json`
  ```json
  {
    "Hunger Games : Sunrise on the Reaping": {
      "user_rating": 3.9,
      "press_rating": 3.2,
      "updated_at": "2026-10-16T08:00:00Z"
    },
    "Film Sans Presse": {
      "user_rating": 3.5,
      "press_rating": null,
      "updated_at": "2026-10-16T08:00:00Z"
    }
  }
  ```
- **Script autonome `scripts/refresh_ratings.py` :**
  - Récupère la liste de tous les titres de films distincts présents dans `web/public/data/showtimes-*.json`.
  - Pour chaque titre non présent dans `ratings.json` ou dont `updated_at` a plus de 7 jours :
    - Recherche sur `https://www.allocine.fr/rechercher/movie/?q=<titre>`.
    - Désambiguïsation : sélection de la fiche correspondant exactement au titre (ou première fiche film si titre unique).
    - Extraction des notes spectateurs et presse via BeautifulSoup.
    - Si un film n'a aucune note ou aucun résultat, enregistre `{ user_rating: null, press_rating: null, updated_at: now }` afin d'éviter les requêtes répétitives et le bannissement HTTP 429.
    - Temporisation polie (0.3s) entre requêtes.
    - Écrit le fichier formaté `web/public/data/ratings.json`.
- **Commande CLI :** Enregistrement dans `cinepass refresh-ratings`.

### 4.2. Badges Allociné dans l'UI (`web/src/components/Badge.ts`)
- **Badge Spectateurs :**
  - Fond `#FFE566` (jaune CinéPass), bordure 2px `#111111`, arrondi `999px`.
  - Texte noir `#111111`, graisse 800, 11px.
  - Icône SVG : Étoile noire pleine 12x12px.
  - Affichage : `${user_rating.toFixed(1)}/5 spec.` (ou `${user_rating.toFixed(1)}` sur mobile).
- **Badge Presse :**
  - Fond `#C4B5FD` (lavande pastel), bordure 2px `#111111`, arrondi `999px`.
  - Texte noir `#111111`, graisse 800, 11px.
  - Icône SVG : Journal noir 12x12px.
  - Affichage : `${press_rating.toFixed(1)}/5 presse` (ou `${press_rating.toFixed(1)}` sur mobile).
  - Si `press_rating === null`, le badge presse est masqué automatiquement.

### 4.3. Moteur Algorithmique du Builder (`web/src/core/scheduler.ts`)
1. **Recherche avec points d'ancrage (`findMarathonsAroundPinned`) :**
   - Reçoit la séance ancrée à un indice donné (ex: position 0, 1 ou 2), la longueur cible (2 ou 3 films), et les préférences (tampons de pause, cinémas cochés, types de pass).
   - Calcule récursivement les sous-marathons compatibles avant l'ancrage et après l'ancrage.
   - Retourne les combinaisons optimales classées par temps de pause agréable.
   - Si aucun film n'est trouvable pour un créneau (ex: contrainte trop serrée), le créneau reste vide (`null`) pour permettre au cinéphile de chercher manuellement.
2. **Recherche des séances compatibles pour un créneau (`getAvailableCandidatesForSlot`) :**
   - Calcule la fenêtre temporelle autorisée :
     - Borne inférieure : fin de la séance précédente + temps de pause minimal + temps de transit entre cinémas.
     - Borne supérieure (si une séance suivante existe) : début de la séance suivante - temps de pause minimal - temps de transit.
   - Renvoie toutes les séances des cinémas sélectionnés comprises dans cette fenêtre, ordonnées par heure de début, avec la pause estimée.

### 4.4. Ergonomie & Workflow Utilisateur (`web/src/pages/index.astro`)
1. **Entrée dans le Builder :**
   - **Depuis le Header :** Clic sur "Mode Builder" $\rightarrow$ active le mode et ouvre immédiatement le tiroir de choix du 1er film avec les films favoris/cochés placés en tête.
   - **Depuis un film :** Clic sur le bouton "Bâtir" devant un titre $\rightarrow$ active le mode builder avec la 1ère séance disponible de ce film verrouillée en position 1, et calcul automatique des créneaux 2 et 3.
2. **Affichage du Builder central :**
   - Remplace la liste des résultats par l'interface "Mon Builder de Marathon".
   - Présente chaque créneau avec son statut :
     - **Verrouillé (Film clé)** : mise en exergue, boutons de position (`[1er] [2e] [3e]`).
     - **Suggestion algo** : badge menthe `#4ECDC4`, bouton "Changer ce film ($N$ options dispo)".
     - **Choix personnalisé** : badge lavande `#C4B5FD`, bouton "Changer ce film".
     - **Vacant / Vide** : bouton "+ Choisir une séance".
3. **Logique de déplacement de position :**
   - Si le film verrouillé passe de $1^{er}$ à $2^e$ :
     - Le film présent en position 2 glisse en position 3 si les horaires le permettent.
     - Le créneau 1 devient vacant et l'algorithme propose automatiquement la meilleure séance antérieure compatible.
4. **Tiroir coulissant d'alternatives (Drawer mobile-friendly) :**
   - S'ouvre depuis le bas de l'écran avec une animation fluide néobrutaliste.
   - Titre avec le créneau visé et le nombre d'options compatibles.
   - Cartes de séances tactiles avec horaire officiel + réel, cinéma, durée, pause, badges Allociné et bouton "Sélectionner".
   - Un clic remplace instantanément la séance dans le créneau et referme le tiroir.
5. **Synchronisation avec le ticket thermique & Sortie :**
   - Le ticket thermique à droite reflète à la seconde près le marathon en cours de composition.
   - Bouton "Valider ce marathon" : conserve le marathon personnalisé dans les résultats et permet l'export `.ics`.
   - Bouton "Quitter le builder" : revient à la vue standard des marathons automatiques.

---

## 5. Décisions Techniques Actées
- **Désambiguïsation Allociné :** Priorité aux résultats correspondant exactement au titre du film. Mise en cache systématique des notes nulles avec TTL de 7 jours pour éviter tout spam HTTP 429.
- **Créneaux sans solution automatique :** Affichage d'un créneau vide avec bouton "+ Choisir une séance" au lieu d'une erreur bloquante.
- **Compatibilité Pass & Cinémas :** Les séances candidates respectent les cinémas actuellement cochés par l'utilisateur.

---

## 6. Vérifications & Tests Prévus
- **Tests unitaires Python (`pytest tests/`) :**
  - Parsing HTML de la recherche Allociné et extraction des notes décimales.
  - Gestion du cache et des films sans note presse.
- **Tests unitaires TypeScript (`npm test` / Vitest) :**
  - Algorithme `findMarathonsAroundPinned` avec ancrage en position 0, 1 et 2.
  - Calcul des bornes de créneau `getAvailableCandidatesForSlot`.
  - Logique de décalage des créneaux ($1 \rightarrow 2 \rightarrow 3$).
- **Vérification responsive & Neobrutalism :**
  - Absence stricte d'emojis système dans le code et les composants.
  - Validation du drawer sur viewport mobile (375px) et desktop.
