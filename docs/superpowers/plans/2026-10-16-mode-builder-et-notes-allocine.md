# Mode Builder Interactif et Notes Allociné Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter un Mode Builder interactif permettant aux cinéphiles de composer leur marathon autour d'un film clé avec propositions algorithmiques et tiroir de sélection mobile-friendly, accompagné de l'affichage des notes Allociné (spectateurs et presse) rafraîchies quotidiennement par script.

**Architecture:** Le backend Python (`src/cinepass_planner/services/allocine_ratings.py` et `scripts/refresh_ratings.py`) scrape et met en cache les notes Allociné dans `web/public/data/ratings.json`. Le frontend Astro/TypeScript charge ce JSON statique, enrichit les fiches films avec deux badges néobrutalistes haute lisibilité, et propose un Mode Builder central alimenté par deux extensions du moteur de backtracking (`findMarathonsAroundPinned` et `getAvailableCandidatesForSlot`).

**Tech Stack:** Python 3.11+ (BeautifulSoup4, requests, pytest), TypeScript / Astro.js, Tailwind CSS, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-16-mode-builder-et-notes-allocine-design.md](file:///C:/Users/bouzi/Desktop/Nassim/projets_dev/cinepass_planning/docs/superpowers/specs/2026-10-16-mode-builder-et-notes-allocine-design.md)

## Global Constraints

- **Zéro emoji système** : Aucun emoji Unicode OS (🎟️, ⚡, 🍿, 🏠, ⏱️, 🎯, etc.) dans l'UI, le HTML, le TS, le CSS ou les commentaires de code. Utilisation exclusive d'icônes SVG noir d'encre `#111111` avec remplissages pastel.
- **Direction artistique Ticket & Pop-Cine Neobrutalism** : Fond crème chaud `#FAFADF`, bordures noires 2px `#111111`, ombres nettes décalées 4px sans flou (`4px 4px 0px 0px #111111`), arrondis doux 8px à 10px (jamais 0px), typographie monospace pour les heures.
- **Contraste des notes Allociné** : Variante 1 obligatoire — fond pastel jaune `#FFE566` (spectateurs) et lavande `#C4B5FD` (presse) avec texte 100% noir d'encre `#111111` en gras 800 et bordure 2px.
- **Architecture statique & serverless** : Zéro appel API Allociné côté client. Tout passe par le fichier statique pré-généré `web/public/data/ratings.json`.
- **Compatibilité mobile** : Tiroir de choix de séances en bas d'écran (bottom-sheet) fluide jusqu'à 80% de hauteur sur smartphone avec cibles tactiles confortables.

## Review Focus

1. **Film sans note presse ou sans note spectateur** : Allociné n'a parfois que la note spectateurs (ex: films récents sans projection de presse ou blockbusters sans revue de presse) -> Le badge presse doit être masqué proprement sans décaler le badge spectateurs ni afficher `NaN` ou `--`.
2. **Recherche Allociné avec homonymes multiples** : Un titre comme *Les Misérables* ou *Street Fighter* renvoie des versions anciennes -> Le parser doit privilégier les résultats de l'année en cours ou avec mention de projection active.
3. **Changement de position d'un film verrouillé ($1 \rightarrow 2$) avec séance suivante incompatible** : Si l'utilisateur passe le film 1 en position 2 mais que la séance déjà en position 2 chevauche temporellement le nouveau créneau -> Le slot 3 doit être réinitialisé proprement à `null` et afficher `+ Choisir une séance`.
4. **Ouverture du builder sans séance disponible** : Utilisateur sélectionne un film qui n'a aucune séance compatible avec ses cinémas cochés -> L'interface doit auto-cocher le cinéma concerné ou afficher un message d'aide clair invitant à cocher le bon cinéma sans planter le script.
5. **Format badge fallback dans le drawer** : Les séances candidates dans le tiroir coulissant doivent rendre correctement leurs tags (`VOSTFR`, `VF`, `IMAX`, `4DX`) et leurs durées réelles (`+15 min pubs`) sans ralentir le défilement.

---

### Task 1: Scraper Allociné & Cache des Notes (Python)

**Files:**
- Create: `src/cinepass_planner/services/allocine_ratings.py`
- Create: `tests/test_allocine_ratings.py`
- Modify: `src/cinepass_planner/cli/main.py`
- Create: `scripts/refresh_ratings.py`

**Interfaces:**
- Produces: `fetch_movie_ratings(title: str, session: requests.Session | None) -> dict[str, float | None]`
- Produces: `refresh_all_ratings(showtimes_dir: Path, output_file: Path, force: bool = False) -> int`

- [ ] **Step 1: Write the failing unit tests for Allociné ratings parser**

```python
# tests/test_allocine_ratings.py
import pytest
from cinepass_planner.services.allocine_ratings import parse_ratings_from_html

def test_parse_ratings_both_press_and_spectators():
    html = """
    <div class="entity-card">
        <a class="meta-title-link">Hunger Games</a>
        <div class="rating-item-content">Presse \n3,4</div>
        <div class="rating-item-content">Spectateurs \n3,8</div>
    </div>
    """
    res = parse_ratings_from_html(html, target_title="Hunger Games")
    assert res == {"user_rating": 3.8, "press_rating": 3.4}

def test_parse_ratings_only_spectators():
    html = """
    <div class="entity-card">
        <a class="meta-title-link">Blockbuster Inédit</a>
        <div class="rating-item-content">Presse \n--</div>
        <div class="rating-item-content">Spectateurs \n4,1</div>
    </div>
    """
    res = parse_ratings_from_html(html, target_title="Blockbuster Inédit")
    assert res == {"user_rating": 4.1, "press_rating": None}

def test_parse_ratings_not_found():
    html = "<div class='no-results'>Aucun résultat</div>"
    res = parse_ratings_from_html(html, target_title="Film Inconnu")
    assert res == {"user_rating": None, "press_rating": None}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\.venv\Scripts\pytest tests/test_allocine_ratings.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'cinepass_planner.services.allocine_ratings'`

- [ ] **Step 3: Implement `allocine_ratings.py` and `scripts/refresh_ratings.py`**

Implement `parse_ratings_from_html`, `fetch_movie_ratings`, and `refresh_all_ratings` with 7-day TTL cache and polite 0.3s sleep in `src/cinepass_planner/services/allocine_ratings.py` and `scripts/refresh_ratings.py`. Register CLI command `refresh-ratings` in `src/cinepass_planner/cli/main.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `.\.venv\Scripts\pytest tests/test_allocine_ratings.py -v`
Expected: PASS (3 tests passed)

- [ ] **Step 5: Run initial rating scrape to seed `web/public/data/ratings.json`**

Run: `.\.venv\Scripts\python scripts/refresh_ratings.py`
Expected: Successfully generates `web/public/data/ratings.json` with cached ratings for existing showtime movies.

---

### Task 2: Modèle de Données & Badges Graphiques Allociné (Frontend)

**Files:**
- Modify: `web/src/core/models.ts`
- Modify: `web/src/components/Badge.ts`
- Modify: `web/tests/parser_utils.test.ts` (ou test dédié `web/tests/badge.test.ts`)

**Interfaces:**
- Consumes: `web/public/data/ratings.json`
- Produces: `renderAllocineRatingsBadge(userRating: number | null | undefined, pressRating: number | null | undefined, compact?: boolean): string`

- [ ] **Step 1: Write the failing unit tests for `renderAllocineRatingsBadge`**

```typescript
// web/tests/badge.test.ts
import { describe, it, expect } from 'vitest';
import { renderAllocineRatingsBadge } from '../src/components/Badge';

describe('renderAllocineRatingsBadge', () => {
  it('renders both spectator and press badges with high contrast styling', () => {
    const html = renderAllocineRatingsBadge(3.9, 3.2);
    expect(html).toContain('3.9');
    expect(html).toContain('3.2');
    expect(html).toContain('#FFE566'); // CinePass yellow
    expect(html).toContain('#C4B5FD'); // Lavender
    expect(html).toContain('color: #111111'); // Black ink text
    expect(html).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u); // NO emojis
  });

  it('omits press badge when press rating is null or undefined', () => {
    const html = renderAllocineRatingsBadge(4.0, null);
    expect(html).toContain('4.0');
    expect(html).not.toContain('presse');
    expect(html).not.toContain('#C4B5FD');
  });

  it('returns empty string when both ratings are missing', () => {
    const html = renderAllocineRatingsBadge(null, null);
    expect(html).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` dans `web/`
Expected: FAIL with `renderAllocineRatingsBadge is not a function`

- [ ] **Step 3: Implement `renderAllocineRatingsBadge` in `web/src/components/Badge.ts` and models in `web/src/core/models.ts`**

Add `MovieRating { user_rating: number | null; press_rating: number | null; updated_at?: string }` to `web/src/core/models.ts`.
Implement `renderAllocineRatingsBadge` with Variant 1 design (ink-black `#111111` text, 2px borders, SVG star and journal icons, strictly zero emojis).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test` dans `web/`
Expected: PASS

---

### Task 3: Algorithme du Builder — Ancrage & Alternatives (TypeScript)

**Files:**
- Modify: `web/src/core/scheduler.ts`
- Modify: `web/tests/scheduler.test.ts`

**Interfaces:**
- Produces: `findMarathonsAroundPinned(allShowtimes: Showtime[], options: { pinnedShowtime: Showtime; pinnedIndex: number; targetCount: number; preferences: SchedulePreferences; selectedCinemas?: Set<string> }): MarathonItinerary[]`
- Produces: `getAvailableCandidatesForSlot(allShowtimes: Showtime[], options: { predecessor: Showtime | null; successor: Showtime | null; preferences: SchedulePreferences; selectedCinemas: Set<string> }): Array<{ showtime: Showtime; gapBeforeMinutes: number; gapAfterMinutes: number }>`

- [ ] **Step 1: Write the failing tests for `findMarathonsAroundPinned` and `getAvailableCandidatesForSlot`**

```typescript
// in web/tests/scheduler.test.ts
describe('Builder mode scheduler functions', () => {
  it('finds compatible marathons when pinning a showtime at slot 0 (first movie)', () => {
    const pinned = createMockShowtime('Film 1', '14:00', '16:00', 'C1');
    const cand1 = createMockShowtime('Film 2', '16:30', '18:30', 'C1');
    const cand2 = createMockShowtime('Film 3', '19:00', '21:00', 'C1');
    const all = [pinned, cand1, cand2];

    const results = findMarathonsAroundPinned(all, {
      pinnedShowtime: pinned,
      pinnedIndex: 0,
      targetCount: 3,
      preferences: defaultPrefs
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].showtimes[0].movie_title).toBe('Film 1');
    expect(results[0].showtimes[1].movie_title).toBe('Film 2');
    expect(results[0].showtimes[2].movie_title).toBe('Film 3');
  });

  it('finds compatible marathons when pinning a showtime at slot 1 (middle movie)', () => {
    const early = createMockShowtime('Matin', '11:00', '13:00', 'C1');
    const pinned = createMockShowtime('Pivot', '14:00', '16:00', 'C1');
    const late = createMockShowtime('Soir', '16:30', '18:30', 'C1');
    const all = [early, pinned, late];

    const results = findMarathonsAroundPinned(all, {
      pinnedShowtime: pinned,
      pinnedIndex: 1,
      targetCount: 3,
      preferences: defaultPrefs
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].showtimes[0].movie_title).toBe('Matin');
    expect(results[0].showtimes[1].movie_title).toBe('Pivot');
    expect(results[0].showtimes[2].movie_title).toBe('Soir');
  });

  it('returns valid candidate showtimes between predecessor and successor', () => {
    const pred = createMockShowtime('A', '14:00', '16:00', 'C1');
    const succ = createMockShowtime('C', '19:00', '21:00', 'C1');
    const validMid = createMockShowtime('B', '16:30', '18:30', 'C1');
    const tooEarly = createMockShowtime('X', '15:00', '17:00', 'C1');
    const tooLate = createMockShowtime('Y', '18:00', '20:00', 'C1');

    const candidates = getAvailableCandidatesForSlot([validMid, tooEarly, tooLate], {
      predecessor: pred,
      successor: succ,
      preferences: defaultPrefs,
      selectedCinemas: new Set(['C1'])
    });

    expect(candidates.map(c => c.showtime.movie_title)).toEqual(['B']);
    expect(candidates[0].gapBeforeMinutes).toBe(30);
    expect(candidates[0].gapAfterMinutes).toBe(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` dans `web/`
Expected: FAIL with `findMarathonsAroundPinned is not defined`

- [ ] **Step 3: Implement `findMarathonsAroundPinned` and `getAvailableCandidatesForSlot` in `web/src/core/scheduler.ts`**

Implement the backtracking search partitioning around `pinnedIndex` and the time window interval check in `web/src/core/scheduler.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test` dans `web/`
Expected: PASS (all tests pass)

---

### Task 4: Composants UI & Déclencheurs (Header, Bouton Bâtir, Tiroir Drawer)

**Files:**
- Modify: `web/src/components/Header.astro`
- Modify: `web/src/components/ItineraryCard.ts`
- Modify: `web/src/pages/index.astro`

**Interfaces:**
- Consumes: `renderAllocineRatingsBadge`, `findMarathonsAroundPinned`, `getAvailableCandidatesForSlot`
- Produces: Header toggle button, Movie priority build triggers, Builder slot timeline, Bottom-sheet drawer

- [ ] **Step 1: Add "Mode Builder" button in `web/src/components/Header.astro`**

Add tactile Neobrutalist button with SVG tool icon (stroke `#111111`, fill `#FFE566`) with id `btn-toggle-builder`.

- [ ] **Step 2: Add "Bâtir" button and Allociné badges on movie pills & screening cards**

In `web/src/pages/index.astro` and `web/src/components/ItineraryCard.ts`, render the "Bâtir" action button with build SVG icon alongside title, and render `renderAllocineRatingsBadge(ratings.user, ratings.press)` for each movie.

- [ ] **Step 3: Build the Builder State Machine & Slot View in `web/src/pages/index.astro`**

Implement:
- `builderActive: boolean` state.
- `builderSlots: (Showtime | null)[]` representing slots 1, 2, 3.
- `pinnedIndex: number` (0, 1, or 2) with buttons `[1er] [2e] [3e]`.
- Cascade shift logic: changing position shifts neighboring slots if compatible and recalculates vacant slots.
- Slot UI rendering: pinned card with status badge, suggested cards with mint badge, and empty slot cards (`+ Choisir une séance`).

- [ ] **Step 4: Build the Alternative Showtimes Drawer (Bottom-sheet)**

Implement:
- Accessible slide-up drawer container from bottom of screen.
- Header with target slot info and count of available options.
- Chronologically sorted screening cards with format tags, real timings, pause durations, and "Sélectionner" button.
- Selection updates the target slot, recalculates transit/pauses, and closes the drawer.
- Synchronize thermal ticket receipt in right column.

- [ ] **Step 5: Verify build and absence of TypeScript errors**

Run: `npm run build` dans `web/`
Expected: Build succeeds with 0 errors.

---

### Task 5: Intégration CI/CD & Tests de Bout en Bout

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Test: All Python tests (`pytest`) + All TypeScript tests (`npm test`) + Astro build (`npm run build`)

- [ ] **Step 1: Update `.github/workflows/deploy.yml` with daily ratings refresh**

Add scheduled cron trigger or include `python scripts/refresh_ratings.py` in the weekly/daily sync workflow to ensure fresh ratings on GitHub Pages.

- [ ] **Step 2: Run full Python test suite**

Run: `.\.venv\Scripts\pytest -v`
Expected: All tests pass.

- [ ] **Step 3: Run full TypeScript test suite**

Run: `npm test` dans `web/`
Expected: All tests pass.

- [ ] **Step 4: Run production Astro build**

Run: `npm run build` dans `web/`
Expected: Generated static pages ready in `web/dist/`.
