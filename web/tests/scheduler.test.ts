import { describe, it, expect } from 'vitest';
import { Scheduler } from '../src/core/scheduler';
import { PassType, type Showtime, type PlanCriteria } from '../src/core/models';

function getSampleShowtimes(): Showtime[] {
  return [
    { cinema_id: 'C1', movie_title: 'Film A', starts_at: '2026-10-18T10:00:00', ends_at: '2026-10-18T12:00:00', date_str: '2026-10-18', format: 'Standard' },
    { cinema_id: 'C1', movie_title: 'Film B', starts_at: '2026-10-18T12:15:00', ends_at: '2026-10-18T14:15:00', date_str: '2026-10-18', format: 'IMAX' },
    { cinema_id: 'C1', movie_title: 'Film B', starts_at: '2026-10-18T14:00:00', ends_at: '2026-10-18T16:00:00', date_str: '2026-10-18', format: 'IMAX' },
    { cinema_id: 'C1', movie_title: 'Film C', starts_at: '2026-10-18T16:20:00', ends_at: '2026-10-18T18:20:00', date_str: '2026-10-18', format: 'Standard' },
    { cinema_id: 'C1', movie_title: 'Film D', starts_at: '2026-10-18T18:35:00', ends_at: '2026-10-18T20:35:00', date_str: '2026-10-18', format: 'Standard' },
  ];
}

describe('Scheduler', () => {
  it('generates valid sequence of target films', () => {
    const scheduler = new Scheduler();
    const criteria: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 3,
      start_time: '09:00',
      max_end_time: '20:00',
      priority_movies: ['Film B'],
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: [],
    };

    const results = scheduler.generatePlans(getSampleShowtimes(), criteria);
    expect(results.length).toBeGreaterThanOrEqual(1);

    const best = results[0];
    expect(best.showtimes.length).toBe(3);
    const titles = best.showtimes.map((s) => s.movie_title);
    expect(titles).toContain('Film B');
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('filters out supplements when disallowed for Silver/Under26', () => {
    const scheduler = new Scheduler();
    const criteria: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 2,
      start_time: '09:00',
      max_end_time: '20:00',
      priority_movies: [],
      pass_type: PassType.SILVER,
      allow_supplements: false,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: [],
    };

    const results = scheduler.generatePlans(getSampleShowtimes(), criteria);
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const plan of results) {
      for (const st of plan.showtimes) {
        expect(st.format).not.toBe('IMAX');
      }
    }
  });

  it('respects required meal break', () => {
    const scheduler = new Scheduler();
    const criteria: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 2,
      start_time: '09:00',
      max_end_time: '17:00',
      priority_movies: [],
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: true,
      language: 'ALL',
      selected_formats: [],
    };

    const results = scheduler.generatePlans(getSampleShowtimes(), criteria);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const best = results[0];
    expect(best.has_meal_break).toBe(true);
    const titles = best.showtimes.map((s) => s.movie_title);
    expect(titles).toEqual(['Film A', 'Film B']);
  });

  it('falls back to fewer films if target count is impossible', () => {
    const scheduler = new Scheduler();
    const s1: Showtime = { cinema_id: 'C1', movie_title: 'Film 1', starts_at: '2026-10-18T10:00:00', ends_at: '2026-10-18T12:00:00', date_str: '2026-10-18' };
    const s2: Showtime = { cinema_id: 'C1', movie_title: 'Film 2', starts_at: '2026-10-18T12:15:00', ends_at: '2026-10-18T14:15:00', date_str: '2026-10-18' };

    const criteria: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 4,
      start_time: '10:00',
      max_end_time: '15:00',
      priority_movies: [],
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: [],
    };

    const results = scheduler.generatePlans([s1, s2], criteria);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].showtimes.length).toBe(2);
  });

  it('filters by language (VOST vs VF)', () => {
    const scheduler = new Scheduler();
    const sVost: Showtime = { cinema_id: 'C1', movie_title: 'Dune VOST', starts_at: '2026-10-18T10:00:00', ends_at: '2026-10-18T12:00:00', date_str: '2026-10-18', version: 'VOST' };
    const sVf: Showtime = { cinema_id: 'C1', movie_title: 'Dune VF', starts_at: '2026-10-18T10:00:00', ends_at: '2026-10-18T12:00:00', date_str: '2026-10-18', version: 'VF' };

    const critVost: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 1,
      start_time: '09:00',
      max_end_time: '23:00',
      priority_movies: [],
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'VOST',
      selected_formats: [],
    };
    const resVost = scheduler.generatePlans([sVost, sVf], critVost);
    expect(resVost.length).toBe(1);
    expect(resVost[0].showtimes[0].version).toBe('VOST');

    const critVf: PlanCriteria = { ...critVost, language: 'VF' };
    const resVf = scheduler.generatePlans([sVost, sVf], critVf);
    expect(resVf.length).toBe(1);
    expect(resVf[0].showtimes[0].version).toBe('VF');
  });

  it('filters by selected formats', () => {
    const scheduler = new Scheduler();
    const sDolby: Showtime = { cinema_id: 'C1', movie_title: 'Verity', starts_at: '2026-10-18T13:45:00', ends_at: '2026-10-18T15:45:00', date_str: '2026-10-18', format: 'Dolby Cinema' };
    const sStd: Showtime = { cinema_id: 'C1', movie_title: 'Garance', starts_at: '2026-10-18T13:45:00', ends_at: '2026-10-18T15:45:00', date_str: '2026-10-18', format: 'Standard' };

    const crit: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 1,
      start_time: '10:00',
      max_end_time: '20:00',
      priority_movies: [],
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: ['Dolby Cinema'],
    };

    const res = scheduler.generatePlans([sDolby, sStd], crit);
    expect(res.length).toBe(1);
    expect(res[0].showtimes[0].format).toBe('Dolby Cinema');
  });

  it('penalizes missing meal instead of dropping all itineraries', () => {
    const scheduler = new Scheduler();
    // Two films in afternoon (14h-18h15) with only 15 min buffer (no meal window 12h-14h or 19h-21h)
    const s1: Showtime = { cinema_id: 'C1', movie_title: 'Film 1', starts_at: '2026-10-18T14:00:00', ends_at: '2026-10-18T16:00:00', date_str: '2026-10-18' };
    const s2: Showtime = { cinema_id: 'C1', movie_title: 'Film 2', starts_at: '2026-10-18T16:15:00', ends_at: '2026-10-18T18:15:00', date_str: '2026-10-18' };

    const crit: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 2,
      start_time: '12:00',
      max_end_time: '20:00',
      priority_movies: [],
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: true, // Requested!
      language: 'ALL',
      selected_formats: [],
    };

    const res = scheduler.generatePlans([s1, s2], crit);
    // Must not return empty array; should return the valid sequence with has_meal_break = false and penalty applied
    expect(res.length).toBe(1);
    expect(res[0].has_meal_break).toBe(false);
  });

  it('excludes already seen movies from generated itineraries', () => {
    const scheduler = new Scheduler();
    const s1: Showtime = { cinema_id: 'C1', movie_title: 'Film Vu', starts_at: '2026-10-18T10:00:00', ends_at: '2026-10-18T12:00:00', date_str: '2026-10-18' };
    const s2: Showtime = { cinema_id: 'C1', movie_title: 'Film Nouveau', starts_at: '2026-10-18T12:15:00', ends_at: '2026-10-18T14:15:00', date_str: '2026-10-18' };

    const criteria: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 2,
      start_time: '09:00',
      max_end_time: '18:00',
      priority_movies: [],
      seen_movies: ['Film Vu'],
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: [],
    };

    const res = scheduler.generatePlans([s1, s2], criteria);
    expect(res.length).toBe(1);
    expect(res[0].showtimes.length).toBe(1);
    expect(res[0].showtimes[0].movie_title).toBe('Film Nouveau');
  });

  it('provides up to 3 standard itineraries and a dedicated 4th marathon for favorite/liked movies', () => {
    const scheduler = new Scheduler();
    // 5 standard high-scoring movies with perfect 15-min gaps (giving 3 standard paths)
    // and 1 movie with a priority like that has a huge 90-min gap (low score)
    const showtimes: Showtime[] = [
      // Track A (perfect short gaps)
      { cinema_id: 'C1', movie_title: 'Blockbuster 1', starts_at: '2026-10-18T10:00:00', ends_at: '2026-10-18T12:00:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Blockbuster 2', starts_at: '2026-10-18T12:15:00', ends_at: '2026-10-18T14:15:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Blockbuster 3', starts_at: '2026-10-18T14:30:00', ends_at: '2026-10-18T16:30:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Blockbuster 4', starts_at: '2026-10-18T16:45:00', ends_at: '2026-10-18T18:45:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Blockbuster 5', starts_at: '2026-10-18T19:00:00', ends_at: '2026-10-18T21:00:00', date_str: '2026-10-18' },

      // Track B (Indie Favorite, with large gaps resulting in heavy penalties)
      { cinema_id: 'C1', movie_title: 'My Liked Indie', starts_at: '2026-10-18T10:00:00', ends_at: '2026-10-18T12:00:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Indie Part 2', starts_at: '2026-10-18T14:00:00', ends_at: '2026-10-18T16:00:00', date_str: '2026-10-18' },
    ];

    const criteria: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 2,
      start_time: '09:00',
      max_end_time: '22:00',
      priority_movies: ['My Liked Indie'],
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: [],
    };

    const results = scheduler.generatePlans(showtimes, criteria);
    // Should have top 3 standard proposals + 1 dedicated 4th favorite proposal = 4 total
    expect(results.length).toBe(4);

    const standardPlans = results.slice(0, 3);
    for (const p of standardPlans) {
      expect(p.is_favorite_pick).toBe(false);
    }

    const fourthPlan = results[3];
    expect(fourthPlan.is_favorite_pick).toBe(true);
    expect(fourthPlan.showtimes).toHaveLength(2);
    expect(fourthPlan.showtimes.map((s) => s.movie_title)).toContain('My Liked Indie');
    // The other movie in the 2-film marathon is allowed to be non-priority to reach target length
    expect(fourthPlan.showtimes.some((s) => !criteria.priority_movies.includes(s.movie_title))).toBe(true);
  });

  it('guarantees that favorite marathon contains ONLY the user selected priority movies when 3 are chosen', () => {
    const scheduler = new Scheduler();
    const showtimes: Showtime[] = [
      // Random non-priority movies
      { cinema_id: 'C1', movie_title: 'Random A', starts_at: '2026-10-18T10:00:00', ends_at: '2026-10-18T11:45:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Random B', starts_at: '2026-10-18T12:00:00', ends_at: '2026-10-18T13:45:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Random C', starts_at: '2026-10-18T14:00:00', ends_at: '2026-10-18T15:45:00', date_str: '2026-10-18' },

      // 3 priority movies selected by user
      { cinema_id: 'C1', movie_title: 'Coup de coeur 1', starts_at: '2026-10-18T10:00:00', ends_at: '2026-10-18T12:00:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Coup de coeur 2', starts_at: '2026-10-18T12:30:00', ends_at: '2026-10-18T14:30:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Coup de coeur 3', starts_at: '2026-10-18T15:00:00', ends_at: '2026-10-18T17:00:00', date_str: '2026-10-18' },
    ];

    const priorityTitles = ['Coup de coeur 1', 'Coup de coeur 2', 'Coup de coeur 3'];

    const criteria: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 3,
      start_time: '09:00',
      max_end_time: '23:00',
      priority_movies: priorityTitles,
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: [],
    };

    const results = scheduler.generatePlans(showtimes, criteria);
    const favoritePlan = results.find((r) => r.is_favorite_pick);
    expect(favoritePlan).toBeDefined();

    // The favorite marathon MUST contain ONLY priority movies
    const favTitles = favoritePlan!.showtimes.map((s) => s.movie_title);
    expect(favTitles).toHaveLength(3);
    for (const title of favTitles) {
      expect(priorityTitles).toContain(title);
    }
    // Absolutely NO non-priority movie allowed
    expect(favTitles).not.toContain('Random A');
    expect(favTitles).not.toContain('Random B');
    expect(favTitles).not.toContain('Random C');
  });

  it('finds compatible marathons when pinning a showtime at slot 0 (first movie)', () => {
    const showtimes: Showtime[] = [
      { cinema_id: 'C1', movie_title: 'Film 1', starts_at: '2026-10-18T14:00:00', ends_at: '2026-10-18T16:00:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Film 2', starts_at: '2026-10-18T16:30:00', ends_at: '2026-10-18T18:30:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Film 3', starts_at: '2026-10-18T19:00:00', ends_at: '2026-10-18T21:00:00', date_str: '2026-10-18' },
    ];

    const scheduler = new Scheduler();
    const criteria: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 3,
      start_time: '10:00',
      max_end_time: '23:00',
      priority_movies: [],
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: [],
    };

    const results = scheduler.findMarathonsAroundPinned(showtimes, {
      pinnedShowtime: showtimes[0],
      pinnedIndex: 0,
      targetCount: 3,
      criteria,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].showtimes[0].movie_title).toBe('Film 1');
    expect(results[0].showtimes[1].movie_title).toBe('Film 2');
    expect(results[0].showtimes[2].movie_title).toBe('Film 3');
  });

  it('finds compatible marathons when pinning a showtime at slot 1 (middle movie)', () => {
    const early: Showtime = { cinema_id: 'C1', movie_title: 'Matin', starts_at: '2026-10-18T11:00:00', ends_at: '2026-10-18T13:00:00', date_str: '2026-10-18' };
    const pinned: Showtime = { cinema_id: 'C1', movie_title: 'Pivot', starts_at: '2026-10-18T14:00:00', ends_at: '2026-10-18T16:00:00', date_str: '2026-10-18' };
    const late: Showtime = { cinema_id: 'C1', movie_title: 'Soir', starts_at: '2026-10-18T16:30:00', ends_at: '2026-10-18T18:30:00', date_str: '2026-10-18' };
    const showtimes = [early, pinned, late];

    const scheduler = new Scheduler();
    const criteria: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 3,
      start_time: '10:00',
      max_end_time: '23:00',
      priority_movies: [],
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: [],
    };

    const results = scheduler.findMarathonsAroundPinned(showtimes, {
      pinnedShowtime: pinned,
      pinnedIndex: 1,
      targetCount: 3,
      criteria,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].showtimes[0].movie_title).toBe('Matin');
    expect(results[0].showtimes[1].movie_title).toBe('Pivot');
    expect(results[0].showtimes[2].movie_title).toBe('Soir');
  });

  it('returns valid candidate showtimes between predecessor and successor', () => {
    const pred: Showtime = { cinema_id: 'C1', movie_title: 'A', starts_at: '2026-10-18T14:00:00', ends_at: '2026-10-18T16:00:00', date_str: '2026-10-18' };
    const succ: Showtime = { cinema_id: 'C1', movie_title: 'C', starts_at: '2026-10-18T19:00:00', ends_at: '2026-10-18T21:00:00', date_str: '2026-10-18' };
    const validMid: Showtime = { cinema_id: 'C1', movie_title: 'B', starts_at: '2026-10-18T16:30:00', ends_at: '2026-10-18T18:30:00', date_str: '2026-10-18' };
    const tooEarly: Showtime = { cinema_id: 'C1', movie_title: 'X', starts_at: '2026-10-18T15:00:00', ends_at: '2026-10-18T17:00:00', date_str: '2026-10-18' };
    const tooLate: Showtime = { cinema_id: 'C1', movie_title: 'Y', starts_at: '2026-10-18T18:00:00', ends_at: '2026-10-18T20:00:00', date_str: '2026-10-18' };

    const scheduler = new Scheduler();
    const candidates = scheduler.getAvailableCandidatesForSlot([validMid, tooEarly, tooLate], {
      predecessor: pred,
      successor: succ,
      minBufferMinutes: 15,
      selectedCinemas: new Set(['C1']),
    });

    expect(candidates.map((c) => c.showtime.movie_title)).toEqual(['B']);
    expect(candidates[0].gapBeforeMinutes).toBe(30);
    expect(candidates[0].gapAfterMinutes).toBe(30);
  });

  it('filters out showtimes before predecessor (such as 00h midnight) and excludes specified movie titles', () => {
    const pred: Showtime = { cinema_id: 'C1', movie_title: 'Matin 11h', starts_at: '2026-10-18T11:00:00', ends_at: '2026-10-18T13:00:00', date_str: '2026-10-18' };
    const midnight: Showtime = { cinema_id: 'C1', movie_title: 'Minuit', starts_at: '2026-10-18T00:15:00', ends_at: '2026-10-18T02:00:00', date_str: '2026-10-18' };
    const earlyMorning: Showtime = { cinema_id: 'C1', movie_title: 'Aurore', starts_at: '2026-10-18T09:00:00', ends_at: '2026-10-18T10:30:00', date_str: '2026-10-18' };
    const validAfter: Showtime = { cinema_id: 'C1', movie_title: 'Apres-midi', starts_at: '2026-10-18T13:30:00', ends_at: '2026-10-18T15:30:00', date_str: '2026-10-18' };
    const sameMovieLater: Showtime = { cinema_id: 'C1', movie_title: 'Matin 11h', starts_at: '2026-10-18T16:00:00', ends_at: '2026-10-18T18:00:00', date_str: '2026-10-18' };

    const scheduler = new Scheduler();
    const candidates = scheduler.getAvailableCandidatesForSlot(
      [midnight, earlyMorning, validAfter, sameMovieLater],
      {
        predecessor: pred,
        successor: null,
        minBufferMinutes: 15,
        selectedCinemas: new Set(['C1']),
        excludedTitles: new Set(['Matin 11h']),
      }
    );

    // Midnight (00:15) and Aurore (09:00) are BEFORE pred ends (13:00) so they must be excluded!
    // Matin 11h is in excludedTitles so it must be excluded!
    // Only Apres-midi (13:30) must remain!
    expect(candidates.map((c) => c.showtime.movie_title)).toEqual(['Apres-midi']);
    expect(candidates[0].gapBeforeMinutes).toBe(30);
  });

  it('supports targetCount: 2 when pinning a showtime in builder mode', () => {
    const showtimes: Showtime[] = [
      { cinema_id: 'C1', movie_title: 'Film 1', starts_at: '2026-10-18T11:00:00', ends_at: '2026-10-18T13:00:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Film 2', starts_at: '2026-10-18T13:30:00', ends_at: '2026-10-18T15:30:00', date_str: '2026-10-18' },
      { cinema_id: 'C1', movie_title: 'Film 3', starts_at: '2026-10-18T16:00:00', ends_at: '2026-10-18T18:00:00', date_str: '2026-10-18' },
    ];

    const scheduler = new Scheduler();
    const criteria: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 2,
      start_time: '10:00',
      max_end_time: '23:00',
      priority_movies: [],
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: [],
    };

    const results = scheduler.findMarathonsAroundPinned(showtimes, {
      pinnedShowtime: showtimes[0],
      pinnedIndex: 0,
      targetCount: 2,
      criteria,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].showtimes).toHaveLength(2);
    expect(results[0].showtimes[0].movie_title).toBe('Film 1');
    expect(results[0].showtimes[1].movie_title).toBe('Film 2');
  });

  it('does not abort search before pinned when an early candidate has long runtime', () => {
    // Candidate 0: starts early but ends late (after pinned movie starts)
    const longEarly: Showtime = { cinema_id: 'C1', movie_title: 'Long Film', starts_at: '2026-10-18T10:00:00', ends_at: '2026-10-18T15:00:00', date_str: '2026-10-18' };
    // Candidate 1: starts slightly later but ends well in time
    const shortEarly: Showtime = { cinema_id: 'C1', movie_title: 'Short Film', starts_at: '2026-10-18T10:30:00', ends_at: '2026-10-18T12:00:00', date_str: '2026-10-18' };
    // Pinned movie at slot 1 (starts 13:00)
    const pinned: Showtime = { cinema_id: 'C1', movie_title: 'Pinned Pivot', starts_at: '2026-10-18T13:00:00', ends_at: '2026-10-18T15:00:00', date_str: '2026-10-18' };

    const scheduler = new Scheduler();
    const criteria: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 2,
      start_time: '10:00',
      max_end_time: '23:00',
      priority_movies: [],
      pass_type: PassType.GOLD,
      allow_supplements: true,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: [],
    };

    const results = scheduler.findMarathonsAroundPinned([longEarly, shortEarly, pinned], {
      pinnedShowtime: pinned,
      pinnedIndex: 1,
      targetCount: 2,
      criteria,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].showtimes[0].movie_title).toBe('Short Film');
    expect(results[0].showtimes[1].movie_title).toBe('Pinned Pivot');
  });

  it('prefers Premium screening over Standard screening for Gold pass even if pause is slightly longer', () => {
    const hungerGames: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Hunger Games',
      starts_at: '2026-10-18T13:30:00',
      ends_at: '2026-10-18T16:30:00',
      date_str: '2026-10-18',
      format: 'Standard',
    };
    const verityStandard: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Verity',
      starts_at: '2026-10-18T17:00:00',
      ends_at: '2026-10-18T19:00:00',
      date_str: '2026-10-18',
      format: 'Standard',
    };
    const verityPremium: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Verity',
      starts_at: '2026-10-18T17:05:00',
      ends_at: '2026-10-18T19:05:00',
      date_str: '2026-10-18',
      format: 'Premium',
    };

    const scheduler = new Scheduler();
    const criteria: PlanCriteria = {
      cinema_ids: ['C1'],
      date_str: '2026-10-18',
      target_films_count: 2,
      start_time: '10:00',
      max_end_time: '23:00',
      priority_movies: [],
      pass_type: PassType.GOLD,
      allow_supplements: false,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: [],
    };

    const results = scheduler.findMarathonsAroundPinned(
      [hungerGames, verityStandard, verityPremium],
      {
        pinnedShowtime: hungerGames,
        pinnedIndex: 0,
        targetCount: 2,
        criteria,
      }
    );

    expect(results.length).toBeGreaterThanOrEqual(1);
    // The top proposal must choose the Premium screening (17:05) over the Standard (17:00)
    expect(results[0].showtimes[1].format).toBe('Premium');
    expect(results[0].showtimes[1].starts_at).toBe('2026-10-18T17:05:00');
  });

  it('allows 27-minute inter-cinema transition when min_buffer_minutes is 15', () => {
    const hungerGamesC1: Showtime = {
      cinema_id: 'C1',
      movie_title: 'Hunger Games',
      starts_at: '2026-10-18T13:30:00',
      ends_at: '2026-10-18T16:38:00',
      date_str: '2026-10-18',
      format: 'Standard',
    };
    const verityPremiumC2: Showtime = {
      cinema_id: 'C2',
      movie_title: 'Verity',
      starts_at: '2026-10-18T17:05:00',
      ends_at: '2026-10-18T19:05:00',
      date_str: '2026-10-18',
      format: 'Premium',
    };

    const scheduler = new Scheduler();
    const criteria: PlanCriteria = {
      cinema_ids: ['C1', 'C2'],
      date_str: '2026-10-18',
      target_films_count: 2,
      start_time: '10:00',
      max_end_time: '23:00',
      priority_movies: [],
      pass_type: PassType.GOLD,
      allow_supplements: false,
      min_buffer_minutes: 15,
      require_meal_break: false,
      language: 'ALL',
      selected_formats: [],
    };

    const results = scheduler.findMarathonsAroundPinned(
      [hungerGamesC1, verityPremiumC2],
      {
        pinnedShowtime: hungerGamesC1,
        pinnedIndex: 0,
        targetCount: 2,
        criteria,
      }
    );

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].showtimes[1].cinema_id).toBe('C2');
    expect(results[0].showtimes[1].starts_at).toBe('2026-10-18T17:05:00');
  });
});




