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
    expect(fourthPlan.showtimes.map((s) => s.movie_title)).toContain('My Liked Indie');
    expect(fourthPlan.showtimes.every((s) => criteria.priority_movies.includes(s.movie_title))).toBe(true);
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
});

