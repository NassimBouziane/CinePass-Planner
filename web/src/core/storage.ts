export interface UserPreferences {
  city?: string;
  selected_cinemas?: string[];
  pass_formula?: string; // "Gold", "Silver", "-26 ans"
  allow_supplements?: boolean;
  language?: string; // "ALL", "VOST", "VF"
  selected_formats?: string[];
  target_count?: number;
  start_time?: string;
  end_time?: string;
  require_meal?: boolean;
  min_buffer?: number;
  scenario?: string; // "optimal", "same_cinema", "short_breaks"
  seen_movies?: string[];
  priority_movies?: string[];
  priority_hide_unavailable?: boolean;
}

const STORAGE_KEY = 'cinepass_planner_prefs_v1';
let cachedPrefs: UserPreferences | null = null;

export function loadPreferences(): UserPreferences {
  if (cachedPrefs !== null) return cachedPrefs;
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedPrefs = {};
      return cachedPrefs;
    }
    cachedPrefs = JSON.parse(raw);
    return cachedPrefs || {};
  } catch (e) {
    console.error('Failed to load preferences from localStorage', e);
    cachedPrefs = {};
    return cachedPrefs;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  cachedPrefs = prefs;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save preferences to localStorage', e);
  }
}

export function clearPreferences(): void {
  cachedPrefs = {};
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear preferences from localStorage', e);
  }
}
