import { describe, it, expect } from 'vitest';
import { t, formatDateLocalized, translations } from '../src/core/i18n';

describe('i18n module', () => {
  it('provides complete translations for all keys in both languages', () => {
    const frKeys = Object.keys(translations.fr);
    const enKeys = Object.keys(translations.en);
    expect(frKeys.length).toBeGreaterThan(20);
    expect(frKeys.sort()).toEqual(enKeys.sort());
  });

  it('interpolates parameters correctly', () => {
    expect(t('marathonFilms', 'fr', { n: 4 })).toBe('marathon 4 films');
    expect(t('marathonFilms', 'en', { n: 4 })).toBe('4-movie marathon');
    expect(t('ticketProgram', 'fr', { n: 3 })).toBe('programme (3 séances)');
    expect(t('ticketProgram', 'en', { n: 3 })).toBe('schedule (3 movies)');
    expect(t('proposalsFoundWithFavorite', 'fr', { n: 3, s: 's' })).toBe('3 propositions + 1 marathon coup de cœur');
    expect(t('proposalsFoundWithFavorite', 'en', { n: 3, s: 's' })).toBe('3 proposals + 1 favorite marathon');
  });

  it('formats dates localized according to language', () => {
    const frDate = formatDateLocalized('2026-10-18', 'fr');
    const enDate = formatDateLocalized('2026-10-18', 'en');

    expect(frDate.toLowerCase()).toContain('dimanche');
    expect(frDate.toLowerCase()).toContain('octobre');

    expect(enDate.toLowerCase()).toContain('sunday');
    expect(enDate.toLowerCase()).toContain('october');
  });

  it('falls back to French when given unknown language', () => {
    // @ts-expect-error testing invalid language input
    const res = t('resetBtn', 'es');
    expect(res).toBe('reset');
  });
});
