import { describe, it, expect } from 'vitest';
import { t, formatDateLocalized, formatOrdinal, translations } from '../src/core/i18n';

describe('i18n module', () => {
  it('provides complete translations for all keys in both languages', () => {
    const frKeys = Object.keys(translations.fr);
    const enKeys = Object.keys(translations.en);
    expect(frKeys.length).toBeGreaterThan(50);
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

  it('translates builder mode keys correctly with interpolation', () => {
    expect(t('builderSlotName', 'fr', { n: 1 })).toBe('créneau 01');
    expect(t('builderSlotName', 'en', { n: 1 })).toBe('slot 01');
    expect(t('builderBreakSameCinema', 'fr', { gapMin: 25 })).toBe('pause de 25 min sur place');
    expect(t('builderBreakSameCinema', 'en', { gapMin: 25 })).toBe('break of 25 min on site');
    expect(t('builderDrawerSlotTitle', 'fr', { slotNumber: 2 })).toBe('choisir la séance 02');
    expect(t('builderDrawerSlotTitle', 'en', { slotNumber: 2 })).toBe('pick screening 02');
    expect(t('builderSubProposalCycle', 'fr', { idx: 1, total: 3 })).toBe('proposition auto 1 / 3 appliquée (clique sur recalculer pour défiler)');
    expect(t('builderSubProposalCycle', 'en', { idx: 1, total: 3 })).toBe('auto proposal 1 / 3 applied (click recompute to cycle)');
  });

  it('formats ordinals correctly in French and English', () => {
    expect(formatOrdinal(1, 'fr')).toBe('1er');
    expect(formatOrdinal(2, 'fr')).toBe('2e');
    expect(formatOrdinal(3, 'fr')).toBe('3e');
    expect(formatOrdinal(4, 'fr')).toBe('4e');

    expect(formatOrdinal(1, 'en')).toBe('1st');
    expect(formatOrdinal(2, 'en')).toBe('2nd');
    expect(formatOrdinal(3, 'en')).toBe('3rd');
    expect(formatOrdinal(4, 'en')).toBe('4th');
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

