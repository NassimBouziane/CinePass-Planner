import { describe, it, expect } from 'vitest';
import {
  parseRuntimeToMinutes,
  computeEndTime,
  isValidTransition,
  coversMealBreak,
  determineShowtimeFormat,
} from '../src/core/parser_utils';
import type { Showtime } from '../src/core/models';

describe('parser_utils', () => {
  it('parses runtime strings correctly', () => {
    expect(parseRuntimeToMinutes('1h 52min')).toBe(112);
    expect(parseRuntimeToMinutes('2h 00min')).toBe(120);
    expect(parseRuntimeToMinutes('2h')).toBe(120);
    expect(parseRuntimeToMinutes('45min')).toBe(45);
    expect(parseRuntimeToMinutes('3h 15min')).toBe(195);
    expect(parseRuntimeToMinutes(null)).toBe(120);
    expect(parseRuntimeToMinutes(0)).toBe(120);
    expect(parseRuntimeToMinutes('inconnu')).toBe(120);
    expect(parseRuntimeToMinutes(115)).toBe(115);
  });

  it('computes end time from ISO string and runtime minutes', () => {
    expect(computeEndTime('2026-10-18T10:15:00', 150)).toBe('2026-10-18T12:45:00');
    expect(computeEndTime('2026-10-18T14:00:00', 125)).toBe('2026-10-18T16:05:00');
  });

  it('validates transition buffer between showtimes', () => {
    const s1: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Film 1',
      starts_at: '2026-10-18T10:00:00',
      ends_at: '2026-10-18T12:00:00',
      date_str: '2026-10-18',
    };
    const s2: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Film 2',
      starts_at: '2026-10-18T12:15:00',
      ends_at: '2026-10-18T14:00:00',
      date_str: '2026-10-18',
    };
    const sTooEarly: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Film 3',
      starts_at: '2026-10-18T12:14:00',
      ends_at: '2026-10-18T14:00:00',
      date_str: '2026-10-18',
    };

    expect(isValidTransition(s1, s2, 15)).toBe(true);
    expect(isValidTransition(s1, sTooEarly, 15)).toBe(false);
  });

  it('detects meal breaks in lunch (12h-14h) and dinner (19h-21h) windows', () => {
    // Lunch break 12h00 - 14h00
    const s1: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Matin',
      starts_at: '2026-10-18T10:00:00',
      ends_at: '2026-10-18T12:30:00',
      date_str: '2026-10-18',
    };
    const s2: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Apres-midi',
      starts_at: '2026-10-18T13:45:00',
      ends_at: '2026-10-18T15:30:00',
      date_str: '2026-10-18',
    };
    expect(coversMealBreak(s1, s2, 60)).toBe(true);

    // Dinner break 19h00 - 21h00
    const s3: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Aprem',
      starts_at: '2026-10-18T16:00:00',
      ends_at: '2026-10-18T18:45:00',
      date_str: '2026-10-18',
    };
    const s4: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Soir',
      starts_at: '2026-10-18T20:00:00',
      ends_at: '2026-10-18T22:00:00',
      date_str: '2026-10-18',
    };
    expect(coversMealBreak(s3, s4, 60)).toBe(true);

    // Only 20 min transition: no meal break
    const s5: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Aprem 2',
      starts_at: '2026-10-18T16:00:00',
      ends_at: '2026-10-18T18:00:00',
      date_str: '2026-10-18',
    };
    const s6: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Soir 2',
      starts_at: '2026-10-18T18:20:00',
      ends_at: '2026-10-18T20:20:00',
      date_str: '2026-10-18',
    };
    expect(coversMealBreak(s5, s6, 45)).toBe(false);
  });

  it('determines format accurately', () => {
    expect(determineShowtimeFormat(['IMAX'])).toBe('IMAX');
    expect(determineShowtimeFormat(['DOLBY CINEMA'])).toBe('Dolby Cinema');
    expect(determineShowtimeFormat(['4DX'])).toBe('4DX');
    expect(determineShowtimeFormat(['SCREENX'])).toBe('ScreenX');
    expect(determineShowtimeFormat(undefined, ['3D'])).toBe('3D');
    expect(determineShowtimeFormat()).toBe('Standard');
  });

  it('escapes html and formats badges properly', async () => {
    const { getFormatBadgeHtml, escapeHtml } = await import('../src/components/Badge');
    const { PassType } = await import('../src/core/models');

    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escapeHtml('Film & Cie')).toBe('Film &amp; Cie');

    // Case-insensitive Standard
    const badgeStd = getFormatBadgeHtml('standard', PassType.SILVER);
    expect(badgeStd).toContain('Standard');
    expect(badgeStd).not.toContain('+Supplément');

    // Laser should not have a supplement for Silver
    const badgeLaser = getFormatBadgeHtml('Laser', PassType.SILVER);
    expect(badgeLaser).toContain('Laser');
    expect(badgeLaser).not.toContain('+Supplément');

    // IMAX should have (+Supplément) for Silver and (Inclus Gold) for Gold
    const badgeImaxSilver = getFormatBadgeHtml('IMAX', PassType.SILVER);
    expect(badgeImaxSilver).toContain('+Supplément');

    const badgeImaxGold = getFormatBadgeHtml('IMAX', PassType.GOLD);
    expect(badgeImaxGold).toContain('Inclus Gold');
  });
});

