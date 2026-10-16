import { describe, it, expect } from 'vitest';
import { renderAllocineRatingsBadge } from '../src/components/Badge';

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
