import json
from pathlib import Path
from typing import Optional
from cinepass_planner.config import DATA_DIR

DEFAULT_PREFERENCES_PATH = DATA_DIR / "user_preferences.json"

DEFAULT_PREFERENCES = {
    "city": "Toutes",
    "selected_cinemas": [],
    "pass_formula": "Gold",
    "allow_supplements": True,
    "target_count": 3,
    "start_time": "10:00",
    "end_time": "23:00",
    "require_meal": True,
    "min_buffer": 15,
    "language": "Toutes",
    "selected_formats": [],
}

def load_preferences(path: Optional[Path] = None) -> dict:
    target = path or DEFAULT_PREFERENCES_PATH
    if target.exists():
        try:
            with open(target, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Merge with defaults
                merged = dict(DEFAULT_PREFERENCES)
                merged.update(data)
                return merged
        except Exception:
            return dict(DEFAULT_PREFERENCES)
    return dict(DEFAULT_PREFERENCES)

def save_preferences(preferences: dict, path: Optional[Path] = None) -> None:
    target = path or DEFAULT_PREFERENCES_PATH
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "w", encoding="utf-8") as f:
        json.dump(preferences, f, ensure_ascii=False, indent=2)
