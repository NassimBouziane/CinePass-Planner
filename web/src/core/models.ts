export enum PassType {
  GOLD = 'Gold',
  SILVER = 'Silver',
  UNDER26 = '-26 ans',
  OTHER = 'Autre'
}

export interface Cinema {
  id: string;
  name: string;
  city: string;
  address?: string;
  group_type?: string;
  accepts_gold?: boolean;
  accepts_silver?: boolean;
  accepts_under26?: boolean;
  is_pathe_network?: boolean;
  formats?: string[];
}

export interface MovieRating {
  user_rating: number | null;
  press_rating: number | null;
  updated_at?: string;
}

export type MovieRatingsMap = Record<string, MovieRating>;

export interface Showtime {
  cinema_id: string;
  movie_title: string;
  starts_at: string; // ISO string: "YYYY-MM-DDTHH:MM:SS"
  ends_at: string;   // ISO string: "YYYY-MM-DDTHH:MM:SS"
  date_str: string;  // "YYYY-MM-DD"
  version?: string;  // "ORIGINAL", "DUBBED", "VOST", "VF"
  format?: string;   // "Standard", "IMAX", "Dolby Cinema", "4DX", etc.
  cinema_name?: string;
  poster_url?: string;
  user_rating?: number | null;
  press_rating?: number | null;
}

export interface Itinerary {
  showtimes: Showtime[];
  total_movie_minutes: number;
  total_pause_minutes: number;
  score: number;
  has_meal_break: boolean;
  is_favorite_pick?: boolean;
  priority_matches_count?: number;
}

export interface PlanCriteria {
  cinema_ids: string[];
  date_str: string;
  target_films_count: number;
  start_time: string; // "10:00"
  max_end_time: string; // "23:00"
  priority_movies: string[];
  seen_movies?: string[];
  pass_type: PassType;
  allow_supplements: boolean;
  min_buffer_minutes: number;
  require_meal_break: boolean;
  language: string; // "ALL", "VOST", "VF"
  selected_formats: string[];
}
