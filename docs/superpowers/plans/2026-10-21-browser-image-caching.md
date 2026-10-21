# Browser Image Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement client-side browser caching for movie posters via a Service Worker using a Cache-First strategy, preventing redundant image requests to Allocine servers, improving load speed, and providing offline resilience.

**Architecture:** A standalone Service Worker script (`web/public/sw.js`) intercepts HTTP requests for image assets (specifically Allocine CDN `acsta.net` posters and local image assets) and serves them from the browser's `CacheStorage`. The Astro client (`web/src/pages/index.astro`) registers the Service Worker under the dynamic `BASE_PATH` upon page load.

**Tech Stack:** Native Web APIs (Service Worker API, CacheStorage API), TypeScript, Vitest, Astro.

**Spec:** Direct user requirement: "Mettre en cache les images pour ne pas surcharger l'api pour les images" with user-selected browser-side implementation.

## Global Constraints

- Strictly ZERO emojis in any file (code, comments, documentation, commit messages).
- Backward compatibility: existing itinerary builder and static data structures remain intact.
- Safe cross-origin handling: handle opaque responses (`response.type === 'opaque'`) properly when caching external images.
- Scope-aware registration: support both root `/` deployment and GitHub Pages base paths (e.g., `/CinePass-Planner/`).

## Review Focus

1. Cross-origin opaque responses: Allocine CDN responses have status 0 in no-cors mode; CacheStorage must accept and store them properly.
2. Scope mismatch: Service worker must be registered with the right scope relative to `BASE_PATH` on GitHub Pages.
3. Cache invalidation / size boundary: Avoid unbounded cache growth by limiting max stored entries or versioning cache names (`cinepass-posters-v1`).
4. Broken image fallback: If an image fails to load or network is offline without cached asset, UI should degrade gracefully without breaking layout.
5. Service Worker lifecycle: Ensure `skipWaiting()` and `clients.claim()` allow immediate cache activation without requiring multiple page reloads.

---

### Task 1: Create the Service Worker Script

**Files:**
- Create: `web/public/sw.js`
- Test: `web/tests/service_worker.test.ts`

- [ ] Write unit tests in `web/tests/service_worker.test.ts` validating:
  - Detection function for poster/image URLs (Allocine `acsta.net` and standard image extensions).
  - Cache name declaration and version isolation.
  - Cache expiration/pruning logic.
- [ ] Run `npm test` to verify test failure before implementation (TDD).
- [ ] Implement `web/public/sw.js`:
  - Define `CACHE_NAME = 'cinepass-posters-v1'`.
  - Handle `install` event with `self.skipWaiting()`.
  - Handle `activate` event with `self.clients.claim()` and cleanup of previous cache versions.
  - Handle `fetch` event with Cache-First strategy for images (`request.destination === 'image'` or matching `acsta.net` / image extensions):
    - Check `caches.match(request)`.
    - If hit, return cached response immediately.
    - If miss, fetch from network, clone valid response (`response.status === 200 || response.type === 'opaque'`), store in `caches.open(CACHE_NAME)`, and return.
    - Fallback gracefully on network error when offline.
- [ ] Run `npm test` to verify tests pass.

### Task 2: Register Service Worker and Add Image Error Fallbacks in Astro Frontend

**Files:**
- Modify: `web/src/pages/index.astro`
- Modify: `web/src/components/ItineraryCard.ts`

- [ ] In `web/src/pages/index.astro`, add Service Worker registration:
  - Check `'serviceWorker' in navigator`.
  - Register `${BASE_PATH}sw.js` with `{ scope: BASE_PATH }` on window load event.
  - Log info gracefully in dev mode without throwing unhandled exceptions.
- [ ] In `web/src/components/ItineraryCard.ts`, ensure `<img>` tags have `loading="lazy"` and clean styling.
- [ ] In `web/src/pages/index.astro`, ensure modal and builder slot images have lazy loading and fail-safe handling.
- [ ] Run `npm test` to ensure zero regressions in Vitest suite.
- [ ] Run `npm run build` in `web/` to confirm Astro static generation succeeds with `sw.js` included in `web/dist/sw.js`.

### Task 3: Verification and Documentation

**Files:**
- Verify: Full Vitest test suite (`npm test`).
- Verify: Astro build (`npm run build`).
- Verify: Backend test suite (`pytest`).

- [ ] Run `npm test` in `web/` and verify all tests pass.
- [ ] Run `npm run build` in `web/` and verify `web/dist/sw.js` exists.
- [ ] Run Pytest in root (`.\.venv\Scripts\pytest -v`) to confirm backend tests pass.
- [ ] Explain the implementation and changes made to the user.
