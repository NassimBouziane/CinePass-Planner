import { PassType, type Showtime, type Itinerary, type PlanCriteria } from './models';
import { coversMealBreak } from './parser_utils';

export const PREMIUM_KEYWORDS = ['IMAX', '4DX', 'DOLBY', 'SCREENX', '3D', 'ONYX'];

interface CandidateShowtime extends Showtime {
  start_ms: number;
  end_ms: number;
  runtime_min: number;
}

export class Scheduler {
  generatePlans(showtimes: Showtime[], criteria: PlanCriteria): Itinerary[] {
    const dtStartWindow = new Date(`${criteria.date_str}T${criteria.start_time}:00`).getTime();
    const dtEndWindow = new Date(`${criteria.date_str}T${criteria.max_end_time}:00`).getTime();

    const seenSet = new Set(criteria.seen_movies || []);
    const prioritySet = new Set(criteria.priority_movies || []);
    const formatSet =
      criteria.selected_formats && criteria.selected_formats.length > 0
        ? new Set(criteria.selected_formats)
        : null;

    // 1. Filter candidates by window, supplement allowance, language, format, seen movies
    const candidates: CandidateShowtime[] = [];

    for (const st of showtimes) {
      // Exclude movies already seen
      if (seenSet.has(st.movie_title)) {
        continue;
      }

      const dtStarts = new Date(st.starts_at).getTime();
      const dtEnds = new Date(st.ends_at).getTime();

      if (dtStarts < dtStartWindow || dtEnds > dtEndWindow) {
        continue;
      }

      // Premium supplements check
      const fmtUpper = (st.format || '').toUpperCase();
      const isPremium = PREMIUM_KEYWORDS.some((kw) => fmtUpper.includes(kw));
      if (isPremium && criteria.pass_type !== PassType.GOLD && !criteria.allow_supplements) {
        continue;
      }

      // Language filter
      if (criteria.language === 'VOST') {
        const vUpper = (st.version || '').toUpperCase();
        if (!vUpper.includes('VOST') && vUpper !== 'ORIGINAL') {
          continue;
        }
      } else if (criteria.language === 'VF') {
        const vUpper = (st.version || '').toUpperCase();
        if (!vUpper.includes('VF') && vUpper !== 'DUBBED') {
          continue;
        }
      }

      // Technology format filter
      if (formatSet) {
        const stFormat = st.format || 'Standard';
        if (!formatSet.has(stFormat)) {
          continue;
        }
      }

      candidates.push({
        ...st,
        start_ms: dtStarts,
        end_ms: dtEnds,
        runtime_min: Math.round((dtEnds - dtStarts) / 60000),
      });
    }

    candidates.sort((a, b) => a.start_ms - b.start_ms);

    // 2. Search combinations with graceful fallback if target_count impossible
    let validPaths: CandidateShowtime[][] = [];
    for (let count = criteria.target_films_count; count >= 1; count--) {
      validPaths = this.findPaths(candidates, count, criteria.min_buffer_minutes);
      if (validPaths.length > 0) {
        break;
      }
    }

    if (validPaths.length === 0) {
      return [];
    }

    // Helper to score a path
    const scorePath = (path: CandidateShowtime[]): Itinerary => {
      let hasMeal = false;
      for (let i = 0; i < path.length - 1; i++) {
        const gapMin = (path[i + 1].start_ms - path[i].end_ms) / 60000;
        if (gapMin >= 45 && coversMealBreak(path[i], path[i + 1])) {
          hasMeal = true;
          break;
        }
      }

      let totalMovieMin = 0;
      let totalPauseMin = 0;
      let score = path.length * 1000;
      let priorityMatches = 0;

      for (const st of path) {
        totalMovieMin += st.runtime_min;

        if (prioritySet.has(st.movie_title)) {
          score += 2000;
          priorityMatches++;
        }
      }

      for (let i = 0; i < path.length - 1; i++) {
        const gap = Math.round((path[i + 1].start_ms - path[i].end_ms) / 60000);
        totalPauseMin += gap;

        score -= gap * 1.5;
        if (gap > 60) {
          score -= (gap - 60) * 3.0;
        }

        if (path[i].cinema_id && path[i + 1].cinema_id && path[i].cinema_id !== path[i + 1].cinema_id) {
          score -= 100;
        }
      }

      if (criteria.require_meal_break) {
        if (hasMeal) {
          score += 500;
        } else {
          score -= 500;
        }
      } else if (hasMeal) {
        score += 200;
      }

      return {
        showtimes: path,
        total_movie_minutes: totalMovieMin,
        total_pause_minutes: totalPauseMin,
        score,
        has_meal_break: hasMeal,
        priority_matches_count: priorityMatches,
      };
    };

    // 3. Score standard paths
    const itineraries: Itinerary[] = validPaths.map((path) => scorePath(path));

    // Sort by score descending
    itineraries.sort((a, b) => b.score - a.score);

    // Deduplicate top 3 unique standard paths
    const uniqueItineraries: Itinerary[] = [];
    const seenSignatures = new Set<string>();

    for (const it of itineraries) {
      const sig = it.showtimes.map((s) => `${s.movie_title}@${s.starts_at}`).join('-');
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        uniqueItineraries.push({ ...it, is_favorite_pick: false });
      }
      if (uniqueItineraries.length >= 3) {
        break;
      }
    }

    // Dedicated 4th marathon for liked/priority movies:
    // It must maximize the number of priority movies (up to criteria.target_films_count and prioritySet.size).
    // If prioritySet.size < criteria.target_films_count, other non-priority movies fill the remaining slots
    // to guarantee a full marathon of target length!
    if (prioritySet.size > 0) {
      const desiredPriorityCount = Math.min(prioritySet.size, criteria.target_films_count);
      let favoritePaths: CandidateShowtime[][] = [];

      // Try from full target length, with desiredPriorityCount down to 1
      for (let reqP = desiredPriorityCount; reqP >= 1; reqP--) {
        for (let count = criteria.target_films_count; count >= reqP; count--) {
          favoritePaths = this.findPaths(
            candidates,
            count,
            criteria.min_buffer_minutes,
            prioritySet,
            reqP
          );
          if (favoritePaths.length > 0) {
            break;
          }
        }
        if (favoritePaths.length > 0) {
          break;
        }
      }

      if (favoritePaths.length > 0) {
        const favoriteItineraries = favoritePaths.map((p) => scorePath(p));

        favoriteItineraries.sort((a, b) => {
          // 1. Most priority matches first
          const diffP = (b.priority_matches_count || 0) - (a.priority_matches_count || 0);
          if (diffP !== 0) return diffP;
          // 2. Longest marathon length (target_films_count)
          if (b.showtimes.length !== a.showtimes.length) {
            return b.showtimes.length - a.showtimes.length;
          }
          // 3. Highest quality score
          return b.score - a.score;
        });

        const distinctPriority = favoriteItineraries.find((cand) => {
          const candSig = cand.showtimes.map((s) => `${s.movie_title}@${s.starts_at}`).join('-');
          return !seenSignatures.has(candSig);
        });

        const chosenPriority = distinctPriority || favoriteItineraries[0];
        uniqueItineraries.push({
          ...chosenPriority,
          showtimes: [...chosenPriority.showtimes],
          is_favorite_pick: true,
        });
      }
    }

    return uniqueItineraries;
  }

  private findPaths(
    candidates: CandidateShowtime[],
    targetCount: number,
    minBufferMinutes: number,
    prioritySet?: Set<string>,
    minPriorityCount: number = 0
  ): CandidateShowtime[][] {
    const results: CandidateShowtime[][] = [];
    const MAX_CANDIDATE_PATHS = 300;
    const minBufferMs = minBufferMinutes * 60 * 1000;
    const interCinemaBufferMs = Math.max(minBufferMinutes, 30) * 60 * 1000;

    const backtrack = (
      currentPath: CandidateShowtime[],
      startIdx: number,
      seenTitles: Set<string>,
      priorityMatches: number
    ) => {
      // Early pruning: if remaining slots cannot satisfy minPriorityCount, abort branch
      if (prioritySet && minPriorityCount > 0) {
        const remainingSlots = targetCount - currentPath.length;
        if (priorityMatches + remainingSlots < minPriorityCount) {
          return;
        }
      }

      if (currentPath.length === targetCount) {
        if (!prioritySet || minPriorityCount === 0 || priorityMatches >= minPriorityCount) {
          results.push([...currentPath]);
        }
        return;
      }

      if (results.length >= MAX_CANDIDATE_PATHS) {
        return;
      }

      const last = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;

      for (let i = startIdx; i < candidates.length; i++) {
        if (results.length >= MAX_CANDIDATE_PATHS) {
          return;
        }

        const cand = candidates[i];
        if (seenTitles.has(cand.movie_title)) {
          continue;
        }

        if (last) {
          const reqBuffer =
            last.cinema_id && cand.cinema_id && last.cinema_id !== cand.cinema_id
              ? interCinemaBufferMs
              : minBufferMs;

          const gapMs = cand.start_ms - last.end_ms;
          if (gapMs < reqBuffer) {
            continue;
          }

          if (gapMs > 300 * 60 * 1000 && results.length >= 30) {
            continue;
          }
        }

        const isPriority = prioritySet ? prioritySet.has(cand.movie_title) : false;

        currentPath.push(cand);
        seenTitles.add(cand.movie_title);

        backtrack(
          currentPath,
          i + 1,
          seenTitles,
          isPriority ? priorityMatches + 1 : priorityMatches
        );

        seenTitles.delete(cand.movie_title);
        currentPath.pop();
      }
    };

    backtrack([], 0, new Set(), 0);
    return results;
  }

  findMarathonsAroundPinned(
    showtimes: Showtime[],
    options: {
      pinnedShowtime: Showtime;
      pinnedIndex: number;
      targetCount: number;
      criteria: PlanCriteria;
    }
  ): Itinerary[] {
    const { pinnedShowtime, pinnedIndex, targetCount, criteria } = options;
    const minBufferMinutes = criteria.min_buffer_minutes || 15;
    const minBufferMs = minBufferMinutes * 60 * 1000;
    const interCinemaBufferMs = Math.max(minBufferMinutes, 30) * 60 * 1000;

    const toCandidate = (st: Showtime): CandidateShowtime => {
      const startMs = new Date(st.starts_at).getTime();
      const endMs = new Date(st.ends_at).getTime();
      return {
        ...st,
        start_ms: startMs,
        end_ms: endMs,
        runtime_min: Math.round((endMs - startMs) / 60000),
      };
    };

    const pinnedCand = toCandidate(pinnedShowtime);

    // Filter candidate pool
    const candidates: CandidateShowtime[] = [];
    const seenSet = new Set(criteria.seen_movies || []);
    const formatSet =
      criteria.selected_formats && criteria.selected_formats.length > 0
        ? new Set(criteria.selected_formats)
        : null;

    for (const st of showtimes) {
      if (st.movie_title === pinnedShowtime.movie_title) {
        continue; // Cannot repeat pinned movie
      }
      if (seenSet.has(st.movie_title)) {
        continue;
      }

      // Cinema filter
      if (criteria.cinema_ids && criteria.cinema_ids.length > 0) {
        if (!criteria.cinema_ids.includes(st.cinema_id)) {
          continue;
        }
      }

      // Premium supplements check
      const fmtUpper = (st.format || '').toUpperCase();
      const isPremium = PREMIUM_KEYWORDS.some((kw) => fmtUpper.includes(kw));
      if (isPremium && criteria.pass_type !== PassType.GOLD && !criteria.allow_supplements) {
        continue;
      }

      // Language filter
      if (criteria.language === 'VOST') {
        const vUpper = (st.version || '').toUpperCase();
        if (!vUpper.includes('VOST') && vUpper !== 'ORIGINAL') {
          continue;
        }
      } else if (criteria.language === 'VF') {
        const vUpper = (st.version || '').toUpperCase();
        if (!vUpper.includes('VF') && vUpper !== 'DUBBED') {
          continue;
        }
      }

      // Technology format filter
      if (formatSet) {
        const stFormat = st.format || 'Standard';
        if (!formatSet.has(stFormat)) {
          continue;
        }
      }

      candidates.push(toCandidate(st));
    }

    candidates.sort((a, b) => a.start_ms - b.start_ms);

    // Search prefixes (slots before pinnedIndex)
    const prefixCount = pinnedIndex;
    const suffixCount = targetCount - 1 - pinnedIndex;

    const findChainsBefore = (): CandidateShowtime[][] => {
      if (prefixCount === 0) return [[]];
      const res: CandidateShowtime[][] = [];
      const bt = (current: CandidateShowtime[], startI: number, seenTitles: Set<string>) => {
        if (current.length === prefixCount) {
          // Check buffer between last prefix item and pinnedCand
          const last = current[current.length - 1];
          const reqBuf = last.cinema_id !== pinnedCand.cinema_id ? interCinemaBufferMs : minBufferMs;
          if (pinnedCand.start_ms - last.end_ms >= reqBuf) {
            res.push([...current]);
          }
          return;
        }
        for (let i = startI; i < candidates.length; i++) {
          const c = candidates[i];
          if (c.end_ms > pinnedCand.start_ms - minBufferMs) break;
          if (seenTitles.has(c.movie_title)) continue;
          if (current.length > 0) {
            const prev = current[current.length - 1];
            const reqBuf = prev.cinema_id !== c.cinema_id ? interCinemaBufferMs : minBufferMs;
            if (c.start_ms - prev.end_ms < reqBuf) continue;
          }
          current.push(c);
          seenTitles.add(c.movie_title);
          bt(current, i + 1, seenTitles);
          seenTitles.delete(c.movie_title);
          current.pop();
        }
      };
      bt([], 0, new Set());
      return res;
    };

    const findChainsAfter = (): CandidateShowtime[][] => {
      if (suffixCount === 0) return [[]];
      const res: CandidateShowtime[][] = [];
      const bt = (current: CandidateShowtime[], startI: number, seenTitles: Set<string>) => {
        if (current.length === suffixCount) {
          res.push([...current]);
          return;
        }
        for (let i = startI; i < candidates.length; i++) {
          const c = candidates[i];
          if (current.length === 0) {
            const reqBuf = pinnedCand.cinema_id !== c.cinema_id ? interCinemaBufferMs : minBufferMs;
            if (c.start_ms - pinnedCand.end_ms < reqBuf) continue;
          } else {
            const prev = current[current.length - 1];
            const reqBuf = prev.cinema_id !== c.cinema_id ? interCinemaBufferMs : minBufferMs;
            if (c.start_ms - prev.end_ms < reqBuf) continue;
          }
          if (seenTitles.has(c.movie_title)) continue;
          current.push(c);
          seenTitles.add(c.movie_title);
          bt(current, i + 1, seenTitles);
          seenTitles.delete(c.movie_title);
          current.pop();
        }
      };
      bt([], 0, new Set());
      return res;
    };

    const prefixes = findChainsBefore();
    const suffixes = findChainsAfter();

    const completePaths: CandidateShowtime[][] = [];
    for (const pre of prefixes) {
      for (const suf of suffixes) {
        // Check title uniqueness between pre and suf
        const preTitles = new Set(pre.map((p) => p.movie_title));
        const conflict = suf.some((s) => preTitles.has(s.movie_title));
        if (!conflict) {
          completePaths.push([...pre, pinnedCand, ...suf]);
        }
      }
    }

    if (completePaths.length === 0) {
      return [];
    }

    // Score paths using consistent logic
    const itineraries: Itinerary[] = completePaths.map((path) => {
      let totalMovieMin = 0;
      let totalPauseMin = 0;
      let score = path.length * 1000;
      for (const st of path) {
        totalMovieMin += st.runtime_min;
      }
      for (let i = 0; i < path.length - 1; i++) {
        const gap = Math.round((path[i + 1].start_ms - path[i].end_ms) / 60000);
        totalPauseMin += gap;
        score -= gap * 1.5;
        if (gap > 60) score -= (gap - 60) * 3.0;
        if (path[i].cinema_id && path[i + 1].cinema_id && path[i].cinema_id !== path[i + 1].cinema_id) {
          score -= 100;
        }
      }
      return {
        showtimes: path,
        total_movie_minutes: totalMovieMin,
        total_pause_minutes: totalPauseMin,
        score,
        has_meal_break: false,
      };
    });

    itineraries.sort((a, b) => b.score - a.score);
    return itineraries.slice(0, 10);
  }

  getAvailableCandidatesForSlot(
    showtimes: Showtime[],
    options: {
      predecessor: Showtime | null;
      successor: Showtime | null;
      minBufferMinutes?: number;
      selectedCinemas?: Set<string>;
    }
  ): Array<{ showtime: Showtime; gapBeforeMinutes: number; gapAfterMinutes: number }> {
    const minBuffer = options.minBufferMinutes || 15;
    const minBufferMs = minBuffer * 60 * 1000;
    const interCinemaBufferMs = Math.max(minBuffer, 30) * 60 * 1000;

    const predEndMs = options.predecessor ? new Date(options.predecessor.ends_at).getTime() : null;
    const succStartMs = options.successor ? new Date(options.successor.starts_at).getTime() : null;

    const results: Array<{ showtime: Showtime; gapBeforeMinutes: number; gapAfterMinutes: number }> = [];

    for (const st of showtimes) {
      if (options.selectedCinemas && !options.selectedCinemas.has(st.cinema_id)) {
        continue;
      }

      const stStartMs = new Date(st.starts_at).getTime();
      const stEndMs = new Date(st.ends_at).getTime();

      let gapBefore = 0;
      if (options.predecessor && predEndMs !== null) {
        const reqBuf =
          options.predecessor.cinema_id !== st.cinema_id ? interCinemaBufferMs : minBufferMs;
        if (stStartMs - predEndMs < reqBuf) {
          continue;
        }
        gapBefore = Math.round((stStartMs - predEndMs) / 60000);
      }

      let gapAfter = 0;
      if (options.successor && succStartMs !== null) {
        const reqBuf =
          st.cinema_id !== options.successor.cinema_id ? interCinemaBufferMs : minBufferMs;
        if (succStartMs - stEndMs < reqBuf) {
          continue;
        }
        gapAfter = Math.round((succStartMs - stEndMs) / 60000);
      }

      results.push({
        showtime: st,
        gapBeforeMinutes: gapBefore,
        gapAfterMinutes: gapAfter,
      });
    }

    results.sort(
      (a, b) => new Date(a.showtime.starts_at).getTime() - new Date(b.showtime.starts_at).getTime()
    );
    return results;
  }
}

