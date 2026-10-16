import { describe, it, expect } from 'vitest';
import { renderAllocineRatingsBadge, getFormatBadgeHtml } from '../src/components/Badge';
import { formatThermalReceiptHtml, calculateEstimatedSupplements } from '../src/components/ItineraryCard';
import { PassType, type Itinerary } from '../src/core/models';

describe('renderAllocineRatingsBadge', () => {
  it('renders both spectator and press badges with high contrast styling', () => {
    const html = renderAllocineRatingsBadge(3.9, 3.2);
    expect(html).toContain('3.9');
    expect(html).toContain('3.2');
    expect(html).toContain('bg-[#FFE566]'); // CinePass yellow
    expect(html).toContain('bg-[#C4B5FD]'); // Lavender
    expect(html).toContain('text-[#111111]'); // Black ink text
    expect(html).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u); // NO emojis
  });

  it('omits press badge when press rating is null or undefined', () => {
    const html = renderAllocineRatingsBadge(4.0, null);
    expect(html).toContain('4.0');
    expect(html).not.toContain('presse');
    expect(html).not.toContain('bg-[#C4B5FD]');
  });

  it('returns empty string when both ratings are missing', () => {
    const html = renderAllocineRatingsBadge(null, null);
    expect(html).toBe('');
  });
});

describe('getFormatBadgeHtml & Premium format', () => {
  it('renders Premium badge with CinePass yellow and (Inclus Gold) for Gold pass', () => {
    const html = getFormatBadgeHtml('Premium', PassType.GOLD);
    expect(html).toContain('Premium');
    expect(html).toContain('bg-[#FFE566]');
    expect(html).toContain('(Inclus Gold)');
  });

  it('renders Premium badge with (+Supplément) for Silver pass', () => {
    const html = getFormatBadgeHtml('Premium', PassType.SILVER);
    expect(html).toContain('Premium');
    expect(html).toContain('(+Supplément)');
  });

  it('calculates 5€ supplement for Premium session with Silver pass', () => {
    const itinerary: Itinerary = {
      showtimes: [
        { cinema_id: 'C1', movie_title: 'Film 1', starts_at: '2026-10-18T14:00:00', ends_at: '2026-10-18T16:00:00', date_str: '2026-10-18', format: 'Premium' }
      ],
      total_movie_minutes: 120,
      total_pause_minutes: 0,
      score: 100,
      has_meal_break: false,
    };
    expect(calculateEstimatedSupplements(itinerary, PassType.SILVER)).toBe(5);
    expect(calculateEstimatedSupplements(itinerary, PassType.GOLD)).toBe(0);
  });
});

describe('formatThermalReceiptHtml duration formatting', () => {
  it('correctly calculates total movie duration for a single film without NaNhNaN', () => {
    const singleMovieItinerary: Itinerary = {
      showtimes: [
        { cinema_id: 'C1', movie_title: 'Single Film', starts_at: '2026-10-18T14:00:00', ends_at: '2026-10-18T16:15:00', date_str: '2026-10-18', format: 'Standard' }
      ],
      total_pause_minutes: 0,
      score: 100,
      has_meal_break: false,
      // total_movie_minutes intentionally omitted to verify defensive computation
    } as any;

    const receiptHtml = formatThermalReceiptHtml(singleMovieItinerary, PassType.GOLD, 'fr');
    expect(receiptHtml).not.toContain('NaN');
    expect(receiptHtml).toContain('2h15');
    expect(receiptHtml).toContain('0 min');
  });
});
