import type { Showtime } from './models';

export const DEFAULT_FALLBACK_RUNTIME_MINUTES = 120;

export function parseRuntimeToMinutes(runtimeVal: string | number | null | undefined): number {
  if (runtimeVal === null || runtimeVal === undefined || runtimeVal === 0) {
    return DEFAULT_FALLBACK_RUNTIME_MINUTES;
  }

  if (typeof runtimeVal === 'number') {
    return runtimeVal > 0 ? runtimeVal : DEFAULT_FALLBACK_RUNTIME_MINUTES;
  }

  const runtimeStr = String(runtimeVal).trim();
  if (!runtimeStr) {
    return DEFAULT_FALLBACK_RUNTIME_MINUTES;
  }

  let hours = 0;
  let minutes = 0;

  const hMatch = runtimeStr.match(/(\d+)\s*h/i);
  if (hMatch) {
    hours = parseInt(hMatch[1], 10);
  }

  const mMatch = runtimeStr.match(/(\d+)\s*min/i);
  if (mMatch) {
    minutes = parseInt(mMatch[1], 10);
  } else if (!hMatch) {
    const digitsMatch = runtimeStr.match(/^(\d+)$/);
    if (digitsMatch) {
      const total = parseInt(digitsMatch[1], 10);
      return total > 0 ? total : DEFAULT_FALLBACK_RUNTIME_MINUTES;
    }
  }

  const total = hours * 60 + minutes;
  return total > 0 ? total : DEFAULT_FALLBACK_RUNTIME_MINUTES;
}

export function computeEndTime(startsAtIso: string, runtimeMinutes: number): string {
  const dt = new Date(startsAtIso);
  const endDt = new Date(dt.getTime() + runtimeMinutes * 60 * 1000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const y = endDt.getFullYear();
  const m = pad(endDt.getMonth() + 1);
  const d = pad(endDt.getDate());
  const hh = pad(endDt.getHours());
  const mm = pad(endDt.getMinutes());
  const ss = pad(endDt.getSeconds());

  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
}

export function isValidTransition(s1: Showtime, s2: Showtime, minBufferMinutes: number = 15): boolean {
  const dtS1End = new Date(s1.ends_at).getTime();
  const dtS2Start = new Date(s2.starts_at).getTime();

  const bufferMs = minBufferMinutes * 60 * 1000;
  return dtS2Start >= dtS1End + bufferMs;
}

export function coversMealBreak(s1: Showtime, s2: Showtime, minPauseMinutes: number = 45): boolean {
  const dtS1End = new Date(s1.ends_at);
  const dtS2Start = new Date(s2.starts_at);

  const gapMinutes = (dtS2Start.getTime() - dtS1End.getTime()) / (60 * 1000);
  if (gapMinutes < minPauseMinutes) {
    return false;
  }

  const y = dtS1End.getFullYear();
  const m = dtS1End.getMonth();
  const d = dtS1End.getDate();

  const lunchStart = new Date(y, m, d, 12, 0, 0);
  const lunchEnd = new Date(y, m, d, 14, 0, 0);

  const dinnerStart = new Date(y, m, d, 19, 0, 0);
  const dinnerEnd = new Date(y, m, d, 21, 0, 0);

  const windowOverlapMinutes = (wStart: Date, wEnd: Date): number => {
    const overlapStart = Math.max(dtS1End.getTime(), wStart.getTime());
    const overlapEnd = Math.min(dtS2Start.getTime(), wEnd.getTime());
    if (overlapEnd > overlapStart) {
      return (overlapEnd - overlapStart) / (60 * 1000);
    }
    return 0;
  };

  if (windowOverlapMinutes(lunchStart, lunchEnd) >= minPauseMinutes) {
    return true;
  }

  if (windowOverlapMinutes(dinnerStart, dinnerEnd) >= minPauseMinutes) {
    return true;
  }

  return false;
}

export function determineShowtimeFormat(
  experience?: string[],
  projection?: string[],
  tags?: string[]
): string {
  const allTerms = [
    ...(experience || []),
    ...(projection || []),
    ...(tags || []),
  ].map((t) => String(t).toUpperCase());

  const has = (keyword: string) => allTerms.some((t) => t.includes(keyword));

  if (has('IMAX')) {
    if (has('3D')) return 'IMAX 3D';
    if (has('LASER')) return 'IMAX Laser';
    return 'IMAX';
  }

  if (has('DOLBY') && (has('CINEMA') || has('VISION'))) {
    if (has('3D')) return 'Dolby Cinema 3D';
    return 'Dolby Cinema';
  }

  if (has('4DX')) {
    if (has('3D')) return '4DX 3D';
    return '4DX';
  }

  if (has('SCREENX')) {
    return 'ScreenX';
  }

  if (has('ONYX')) {
    return 'Onyx LED';
  }

  if (has('ATMOS')) {
    return 'Dolby Atmos';
  }

  if (has('3D') || has('REL_3D') || has('F_3D')) {
    return '3D';
  }

  if (has('LASER')) {
    return 'Laser';
  }

  if (has('PREMIUM') || has('PLF') || has('VIP')) {
    if (has('3D')) return 'Premium 3D';
    return 'Premium';
  }

  return 'Standard';
}

export function normalizeText(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’\-–—/.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatCityShort(city: string | null | undefined): string {
  if (!city) return '';
  const upper = city.toUpperCase();
  if (upper.includes('PARIS') || upper.includes('ILE DE FRANCE')) {
    return 'Paris-IDF';
  }
  return city
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

