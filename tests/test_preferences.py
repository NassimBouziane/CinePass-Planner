import json
from pathlib import Path
from cinepass_planner.preferences import load_preferences, save_preferences

def test_load_default_preferences(tmp_path):
    prefs_file = tmp_path / "prefs.json"
    prefs = load_preferences(prefs_file)
    assert prefs["city"] == "Toutes"
    assert prefs["pass_formula"] == "Gold"
    assert prefs["target_count"] == 3

def test_save_and_reload_preferences(tmp_path):
    prefs_file = tmp_path / "prefs.json"
    data = {
        "city": "PARIS - ILE DE FRANCE",
        "selected_cinemas": ["W7502", "C0179"],
        "pass_formula": "Silver",
        "allow_supplements": False,
        "target_count": 4,
        "start_time": "11:00",
        "end_time": "22:00",
        "require_meal": True,
        "min_buffer": 20
    }
    save_preferences(data, prefs_file)
    assert prefs_file.exists()

    reloaded = load_preferences(prefs_file)
    assert reloaded["city"] == "PARIS - ILE DE FRANCE"
    assert reloaded["selected_cinemas"] == ["W7502", "C0179"]
    assert reloaded["pass_formula"] == "Silver"
    assert reloaded["allow_supplements"] is False
