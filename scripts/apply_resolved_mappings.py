import json
import logging
import os
import re
import unicodedata
from difflib import SequenceMatcher

logger = logging.getLogger("apply_resolved_mappings")

OVERRIDES = {
    "Centre Départemental de Promotion du Cinéma-Salle La Turbine": {
        "id": "P9932",
        "address": "Rue De L'Arlequin Place Chorus 74960 Cran-Gevrier",
    },
    "Cinéma Studio Annemasse": {
        "id": "W7411",
        "address": "5 allée Annie Girardot - Chablais Park 74100 Annemasse",
    },
    "Pathé Plan de Campagne": {
        "id": "P0662",
        "address": "Chemin des Pennes aux Pins 13170 Les Pennes Mirabeau",
    },
    "Les Capucins": {
        "id": "B0241",
        "address": "23 rue Marcel Clavier 77120 Coulommiers",
    },
    "3 Cinés Robespierre": {
        "id": "B0151",
        "address": "19, avenue Maximilien Robespierre 94400 Vitry-sur-Seine",
    },
}

def clean_text(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower()
    s = re.sub(r"['\"’\-–—/]", " ", s)
    s = re.sub(r"\b(le|la|les|l|cinema|cinemas|theatre|theatres|salle|pathe|ugc|cgr|multiplexe|mk2|studio|studios|espace)\b", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def main():
    logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")

    with open("data/allocine_theaters_cache.json", "r", encoding="utf-8") as f:
        theaters = json.load(f)

    with open("data/cinemas_mapping.json", "r", encoding="utf-8") as f:
        mapping = json.load(f)

    resolved_count = 0

    for name, meta in sorted(mapping.items()):
        current_id = meta.get("id", "")
        if not current_id or current_id.startswith("IND_"):
            if name in OVERRIDES:
                meta["id"] = OVERRIDES[name]["id"]
                meta["address"] = OVERRIDES[name]["address"]
                resolved_count += 1
                logger.info(f"[OVERRIDE] {name} -> {meta['id']} ({meta['address']})")
                continue

            c_clean = clean_text(name)
            best_t = None
            best_score = 0.0

            for t in theaters:
                t_clean = clean_text(t["name"])
                ratio = SequenceMatcher(None, c_clean, t_clean).ratio()

                if c_clean and t_clean and (c_clean in t_clean or t_clean in c_clean):
                    ratio = max(ratio, 0.82)

                city = meta.get("city", "").lower()
                addr = t.get("address", "").lower()
                if "paris" in city and ("750" in addr or "paris" in addr):
                    ratio += 0.05
                elif city and city in addr:
                    ratio += 0.15

                # Avoid matching Capucins to Brest if in Paris/IDF
                if name == "Les Capucins" and "brest" in addr:
                    continue

                if ratio > best_score:
                    best_score = ratio
                    best_t = t

            if best_t and best_score >= 0.70:
                meta["id"] = best_t["id"]
                meta["address"] = best_t.get("address", "").replace("\r\n", " ").strip()
                resolved_count += 1
                logger.info(f"[RESOLVED] {name:32} -> {meta['id']} ({best_t['name']}) | {meta['address']}")
            else:
                logger.warning(f"[FAILED] Could not resolve: {name}")

    logger.info(f"Total cinemas updated: {resolved_count}")

    with open("data/cinemas_mapping.json", "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

    # Check for any remaining IND_ in mapping
    still_unmapped = [k for k, v in mapping.items() if v.get("id", "").startswith("IND_") or not v.get("id")]
    logger.info(f"Remaining IND_ or empty IDs: {len(still_unmapped)}")
    if still_unmapped:
        logger.info(f"Unresolved list: {still_unmapped}")

if __name__ == "__main__":
    main()
