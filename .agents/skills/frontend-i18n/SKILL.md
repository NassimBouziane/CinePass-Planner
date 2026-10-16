---
name: frontend-i18n
description: Use when creating, modifying, or refactoring frontend UI components, templates, modals, badges, or buttons to enforce strict internationalization (i18n) and prevent unlocalized hardcoded strings.
---

# Frontend Internationalization (i18n)

## Overview

Every user-facing string in the frontend must be internationalized with a single source of truth, typed contract, and symmetric language support (French and English). Never hardcode user-facing strings directly into templates, scripts, or components.

## When to Use

- Creating new frontend UI components, widgets, modals, drawers, or dialogs
- Adding new buttons, labels, tooltips, empty states, or badges
- Refactoring existing user-facing UI elements
- Adding dynamic runtime messages, toast notifications, or subtitle hints
- When reviewing frontend code to verify zero hardcoded strings

## When NOT to Use

- Internal backend code (Python CLI, database migrations, raw data export scripts)
- System logs, debug messages, and developer-only diagnostics
- Fixed technical identifiers (cinema IDs, ISO dates, technology codes)

## Core Principles

1. **Single Source of Truth**: All user-facing strings live in `web/src/core/i18n.ts`.
2. **Strict Parity**: Every key defined in the `Translations` interface MUST exist in both `translations.fr` and `translations.en`.
3. **Dynamic Parameter Interpolation**: Use `{variable}` placeholders instead of manual string concatenation.
4. **Lifecycle Synchronization**: Any element rendered statically or dynamically must update when the active language changes (`applyLanguage`).
5. **Strict Zero Emojis**: Do not use emojis in translations, badges, tooltips, or UI labels. Use SVGs or Neobrutalism geometric accents.

## Step-by-Step Implementation Recipe

Follow these 5 steps in order whenever adding or updating any UI component:

```
[Step 1: Declare Keys] -> [Step 2: Translate FR & EN] -> [Step 3: Call t() in Component] -> [Step 4: Hook applyLanguage] -> [Step 5: Verify Vitest]
```

### Step 1: Declare Typed Keys in `web/src/core/i18n.ts`

Add your keys to the `Translations` interface with semantic naming:

```typescript
export interface Translations {
  // ... existing keys
  myFeatureTitle: string;
  myFeatureSubtitle: string;
  myFeatureActionBtn: string;
  myFeatureCountBadge: string;
}
```

### Step 2: Implement Symmetric Translations in FR and EN

Add the translations to both dictionaries in `web/src/core/i18n.ts`:

```typescript
export const translations: Record<Lang, Translations> = {
  fr: {
    // ...
    myFeatureTitle: 'mon nouveau composant',
    myFeatureSubtitle: 'sélectionne une option pour continuer',
    myFeatureActionBtn: 'confirmer',
    myFeatureCountBadge: '{n} élément{s} sélectionné{s}',
  },
  en: {
    // ...
    myFeatureTitle: 'my new component',
    myFeatureSubtitle: 'select an option to proceed',
    myFeatureActionBtn: 'confirm',
    myFeatureCountBadge: '{n} item{s} selected',
  },
};
```

### Step 3: Use `t()` in the Component or Template

In Astro components, TypeScript UI helpers, or client scripts, always pass the current language and resolve strings through `t()`:

```typescript
// Component or helper function
export function renderMyFeature(lang: Lang, count: number): string {
  const badgeText = t('myFeatureCountBadge', lang, {
    n: count,
    s: count > 1 ? (lang === 'fr' ? 's' : 's') : '',
  });

  return `
    <div class="neo-card p-4">
      <h3 class="font-black text-sm text-[#111111]">${t('myFeatureTitle', lang)}</h3>
      <p class="text-xs text-[#555555]">${t('myFeatureSubtitle', lang)}</p>
      <span class="badge">${badgeText}</span>
      <button type="button" class="neo-btn">${t('myFeatureActionBtn', lang)}</button>
    </div>
  `;
}
```

### Step 4: Register in `applyLanguage()` Lifecycle

In `web/src/pages/index.astro`, ensure that switching languages dynamically updates the component:

```typescript
function applyLanguage(lang: Lang) {
  currentLang = lang;
  // ... update static element IDs
  const titleEl = document.getElementById('my-feature-title');
  if (titleEl) titleEl.textContent = t('myFeatureTitle', lang);

  // If component is dynamically rendered, re-render it
  if (isFeatureActive) {
    renderMyFeatureContainer();
  }
}
```

### Step 5: Verify With Automated Tests

Run the test suite to verify 100% key parity and parameter interpolation:

```bash
npm test
```

Vitest will automatically fail if a key exists in French but is missing in English (or vice versa).

## Formatting Helpers

Use dedicated helpers for non-trivial localized formatting:

| Helper | Purpose | French Example | English Example |
|--------|---------|----------------|-----------------|
| `formatDateLocalized(iso, lang)` | Localized weekday and date | dimanche 18 octobre | Sunday, October 18 |
| `formatOrdinal(n, lang)` | Localized rank / order | 1er, 2e, 3e, 4e | 1st, 2nd, 3rd, 4th |
| `t(key, lang, params)` | Token interpolation | `{n} films` -> `3 films` | `{n} movies` -> `3 movies` |

## Code Comparison: Anti-Pattern vs Best Practice

### Anti-Pattern: Hardcoded Strings in Component

```typescript
// BAD: Hardcoded French strings and inline ternary repetitions
function renderSlot(slotIndex: number, isPinned: boolean) {
  return `
    <div class="slot">
      <span>créneau 0${slotIndex + 1}</span>
      <span>${isPinned ? 'film verrouillé' : 'proposition auto'}</span>
      <button title="Vider ce créneau">✕</button>
    </div>
  `;
}
```

### Best Practice: Fully Localized Component

```typescript
// GOOD: Uses t() with typed keys and active language
function renderSlot(slotIndex: number, isPinned: boolean, lang: Lang) {
  const slotName = t('builderSlotName', lang, { n: slotIndex + 1 });
  const badgeText = isPinned
    ? t('builderPinnedBadge', lang)
    : t('builderAutoBadge', lang);
  const clearTitle = t('builderClearSlotTitle', lang);

  return `
    <div class="slot">
      <span>${slotName}</span>
      <span>${badgeText}</span>
      <button title="${clearTitle}">✕</button>
    </div>
  `;
}
```

## Quick Reference Table

| UI Element | Requirement | Pattern |
|------------|-------------|---------|
| Static HTML Heading | Provide ID + update in `applyLanguage` | `<h3 id="panel-title">...</h3>` -> `el.textContent = t('key', lang)` |
| Button Label | Use `t('keyBtn', lang)` | `<button><span>${t('keyBtn', lang)}</span></button>` |
| Accessible Tooltip (`title`) | Use `t('keyTitle', lang)` | `<button title="${t('keyTitle', lang)}">` |
| Empty / Notice State | Separate title and actionable advice keys | `t('noResultsTitle', lang)` and `t('noResultsAdvice', lang)` |
| Ordinal Position | Call `formatOrdinal(pos, lang)` | `formatOrdinal(1, 'fr')` -> `1er` |
| Dynamic Counter | Token `{n}` with `params: { n: count }` | `t('countLabel', lang, { n: 4 })` |

## Common Mistakes & Rationalizations

| Excuse | Reality |
|--------|---------|
| "It's just a temporary prototype / button, I'll translate later" | Later never comes. Untranslated UI ships to users and breaks language toggling. |
| "Both languages use the same word (e.g. reset, pos, laser)" | The key must still exist in `Translations` and both dictionaries so locales can evolve independently. |
| "I added the French string, I will do English when someone asks" | Parity test fails immediately. The app must stay fully bilingual. |
| "The text is inside a modal drawer, nobody notices" | Modal text is high-visibility and confusing when shown in the wrong language. |
| "I translated the template, so applyLanguage is unnecessary" | Clicking the FR/EN toggle in the header will leave the component in the previous language until page reload. |

## Red Flags - STOP and Fix

- Raw French or English text literals inside `.astro` template string literals or `.ts` renderers
- String concatenation instead of parameter interpolation (`"séance " + idx` instead of `t('step', lang, { n: idx })`)
- Missing corresponding key in either `translations.fr` or `translations.en`
- Adding a new UI modal or panel without adding corresponding update logic in `applyLanguage`
- Emojis inserted into translation values or badges
