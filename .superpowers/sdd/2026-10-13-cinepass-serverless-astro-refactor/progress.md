# SDD ledger — plan: docs/superpowers/plans/2026-10-13-cinepass-serverless-astro-refactor.md

Pre-flight: Scan completed.
- Task 1 produces static JSON files schema consumed by Task 5.
- Task 3 produces models and parser utilities consumed by Task 4 and Task 5.
- Task 4 produces Scheduler engine consumed by Task 5.
- Task 6 automates Task 1 exporter in CI.
- Constraint noted: NO git commits per user instruction. Changes will remain uncommitted locally.

Task 1: complete (tests: uv run pytest -v -> 27/27 pass, Streamlit retired and deleted)
Task 2: complete (Astro.js + Tailwind CSS + Vitest setup verified in web/)
Task 3: complete (tests: npm test -- parser_utils -> 5/5 pass)
Task 4: complete (tests: npm test -> 11/11 pass, Scheduler engine matches Python behavior)
Task 5: complete (Web UI components, interactive client controller, and Astro build verified)
Task 6: complete (sync-all command implemented and tested, .github/workflows/deploy.yml created)
Task 7: complete (Full verification passed: 27/27 pytest, 11/11 vitest, 0 streamlit references, static build clean)

Final Review & Fix Pass:
- Final: fixed Critical 1 (GitHub Pages base_path order and schedule event compatibility in deploy.yml)
- Final: fixed Important 3 (Meal break parity scoring in scheduler.ts — test RED→GREEN, vitest 13/13)
- Final: fixed Important 4 & 6 (escapeHtml & format supplement check in Badge.ts/ItineraryCard.ts — test RED→GREEN, vitest 13/13)
- Final: fixed Important 2 & 5 (Past date banner & URL query sync in index.astro)
- Final: Ruling: Allociné rate limiting in CI handled by per-cinema exception handling in sync-all (cost if wrong: temporary failure on individual cinemas in CI)
- Final: minor (deferred): Add mock test for CLI sync-all
- Final: minor (deferred): Change start/end inputs to type=time
- Final: minor (deferred): Static exporter historical date pruning
All test suites green: Pytest 27/27 pass, Vitest 13/13 pass, Astro build 100% static clean.
