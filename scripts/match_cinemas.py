import json
import logging
import os
import re
import time
import unicodedata
from difflib import SequenceMatcher
from allocineAPI.allocineAPI import allocineAPI

logger = logging.getLogger("match_cinemas")
CACHE_FILE = "data/allocine_theaters_cache.json"

def get_all_theaters():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    locations = [
        ("Pathé Circuit", "circuit-81002"),
        ("Paris", "ville-115755"),
        ("Hauts-de-Seine", "departement-83169"),
        ("Seine-Saint-Denis", "departement-83170"),
        ("Val-de-Marne", "departement-83171"),
        ("Essonne", "departement-83168"),
        ("Yvelines", "departement-83167"),
        ("Val-d'Oise", "departement-83172"),
        ("Seine-et-Marne", "departement-83166"),
        ("Haute-Savoie", "departement-83198"),
        ("Savoie", "departement-83197"),
        ("Calvados", "departement-83160"),
        ("Seine-Maritime", "departement-83164"),
        ("Sarthe", "departement-83176"),
        ("Bas-Rhin", "departement-83104"),
        ("Haute-Garonne", "departement-83152"),
        ("Hérault", "departement-83140"),
        ("Alpes-Maritimes", "departement-83187"),
        ("Bouches-du-Rhône", "departement-83188"),
        ("Rhône", "departement-83196"),
    ]

    api = allocineAPI()
    theaters_dict = {}
    for name, loc_id in locations:
        try:
            items = api.get_cinema(loc_id)
            logger.info(f"Fetched {len(items)} theaters from {name}")
            for t in items:
                theaters_dict[t["id"]] = t
            time.sleep(0.3)
        except Exception as e:
            logger.warning(f"Error fetching {name}: {e}")

    theaters = list(theaters_dict.values())
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(theaters, f, ensure_ascii=False, indent=2)
    return theaters

def clean_text(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower()
    s = re.sub(r"['\"’\-–—/]", " ", s)
    s = re.sub(r"\b(le|la|les|l|cinema|cinemas|theatre|theatres|salle|pathe|ugc|cgr|multiplexe|mk2|studio|studios|espace)\b", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

OVERRIDES = {
    "Centre Départemental de Promotion du Cinéma-Salle La Turbine": "P9932",
    "Cinéma Studio Annemasse": "W7411",
    "Pathé Plan de Campagne": "P0662",
}

def main():
    logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
    theaters = get_all_theaters()
    theaters_by_id = {t["id"]: t for t in theaters}
    logger.info(f"Total Allocine theaters available: {len(theaters)}")

    with open("data/cinemas_mapping.json", "r", encoding="utf-8") as f:
        mapping = json.load(f)

    unmapped = {k: v for k, v in mapping.items() if v.get("id", "").startswith("IND_") or not v.get("id")}
    logger.info(f"Unmapped cinemas to resolve: {len(unmapped)}")

    matches = []
    low_matches = []

    for name, meta in sorted(unmapped.items()):
        if name in OVERRIDES:
            override_id = OVERRIDES[name]
            best_t = theaters_by_id.get(override_id, {"id": override_id, "name": name, "address": ""})
            matches.append((name, meta, best_t, 1.0))
            continue

        c_clean = clean_text(name)
        best_t = None
        best_score = 0.0

        for t in theaters:
            t_clean = clean_text(t["name"])
            ratio = SequenceMatcher(None, c_clean, t_clean).ratio()
            
            # Boost if exact token subset
            if c_clean and t_clean and (c_clean in t_clean or t_clean in c_clean):
                ratio = max(ratio, 0.82)
            
            # Boost if city matches address
            city = meta.get("city", "").lower()
            addr = t.get("address", "").lower()
            if "paris" in city and ("750" in addr or "paris" in addr):
                ratio += 0.05
            elif city and city in addr:
                ratio += 0.15

            if ratio > best_score:
                best_score = ratio
                best_t = t

        if best_score >= 0.70:
            matches.append((name, meta, best_t, best_score))
        else:
            low_matches.append((name, meta, best_t, best_score))

    logger.info(f"MATCHES FOUND: {len(matches)}")
    for name, meta, t, score in matches:
        logger.info(f"{name:32} -> {t['name']:32} [{t['id']}] (score: {score:.2f}) | {t['address']}")

    logger.info(f"LOW / UNMATCHED: {len(low_matches)}")
    for name, meta, t, score in low_matches:
        t_name = t["name"] if t else "None"
        t_id = t["id"] if t else "None"
        logger.info(f"{name:32} (best candidate: {t_name:30} [{t_id}] score: {score:.2f})")

if __name__ == "__main__":
    main()
