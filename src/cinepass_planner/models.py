from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

class PassType(str, Enum):
    GOLD = "Gold"
    SILVER = "Silver"
    UNDER26 = "-26 ans"
    OTHER = "Autre"

@dataclass
class Cinema:
    id: str
    name: str
    city: str
    address: str = ""
    group_type: str = "Les Cinémas Pathé"
    accepts_gold: bool = True
    accepts_silver: bool = True
    accepts_under26: bool = True
    is_pathe_network: bool = True

@dataclass
class Movie:
    id: str
    title: str
    original_title: str = ""
    runtime_minutes: int = 120
    genres: list[str] = field(default_factory=list)
    director: str = ""
    poster_url: str = ""
    synopsis: str = ""
    user_rating: Optional[float] = None
    press_rating: Optional[float] = None

@dataclass
class Showtime:
    cinema_id: str
    movie_title: str
    starts_at: str  # ISO string: "YYYY-MM-DDTHH:MM:SS"
    ends_at: str    # ISO string: "YYYY-MM-DDTHH:MM:SS"
    date_str: str   # "YYYY-MM-DD"
    version: str = "ORIGINAL"  # ORIGINAL, DUBBED
    format: str = "Standard"   # Standard, Dolby Cinema, IMAX, 4DX, Laser, ScreenX
    screen_name: str = ""
    cinema_name: str = ""
    id: Optional[int] = None

@dataclass
class Itinerary:
    showtimes: list[Showtime]
    total_movie_minutes: int
    total_pause_minutes: int
    score: float = 0.0
    has_meal_break: bool = False
