import json
import re
from pathlib import Path
from typing import Optional
import pypdf
from cinepass_planner.models import Cinema

def extract_cinemas_from_pdf(pdf_path: Path) -> list[dict]:
    """
    Parse the official Pathé CinéPass PDF (ReseauCinePassCineCartes.pdf)
    and extract all 136 network cinema records.
    """
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found at {pdf_path}")

    reader = pypdf.PdfReader(str(pdf_path))
    lines: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            lines.extend(text.splitlines())

    cinemas: list[dict] = []
    for line in lines:
        line_clean = line.strip()
        if not line_clean or "ReseauCinePass" in line_clean or "Groupe AGGLOMERATION" in line_clean:
            continue

        match = re.search(r"(Accept[ée]\s+){4}(Accept[ée]es?|Non accept[ée]es?)", line_clean, re.IGNORECASE)
        if not match:
            continue

        raw = line_clean[:match.start()].strip()
        group = "Les Cinémas Pathé"
        if raw.startswith("Les Cinémas Pathé"):
            raw_rest = raw[len("Les Cinémas Pathé"):].strip()
        elif raw.startswith("Cinéma indépendant"):
            group = "Cinéma indépendant"
            raw_rest = raw[len("Cinéma indépendant"):].strip()
        elif raw.startswith("SAS Societe Aixoise Cinematographique"):
            group = "SAS Societe Aixoise Cinematographique"
            raw_rest = raw[len("SAS Societe Aixoise Cinematographique"):].strip()
        else:
            raw_rest = raw

        # Specific check for Paris - Ile de France
        paris_match = re.match(r"^(PARIS\s*-\s*ILE\s*DE\s*France)\s+(.*)", raw_rest, re.IGNORECASE)
        if paris_match:
            city = "PARIS - ILE DE FRANCE"
            name = paris_match.group(2).strip()
        else:
            city_match = re.search(r"([A-Z\s\-]+?)\s+([A-Z][a-z0-9\xE0-\xFF].*)", raw_rest)
            if not city_match:
                continue
            city = city_match.group(1).strip()
            name = city_match.group(2).strip()

        cinemas.append({
            "group": group,
            "city": city,
            "name": name,
            "accepts_under26": True,
            "accepts_cinepass": True,
            "accepts_silver": True,
            "accepts_gold": True,
        })

    return cinemas

def load_or_build_cinema_registry(pdf_path: Path, mapping_path: Optional[Path] = None) -> list[Cinema]:
    """
    Build a list of Cinema models from the PDF, enriching them with Allociné IDs
    from the mapping file (data/cinemas_mapping.json).
    """
    raw_cinemas = extract_cinemas_from_pdf(pdf_path)
    mapping = {}
    if mapping_path and mapping_path.exists():
        with open(mapping_path, "r", encoding="utf-8") as f:
            mapping = json.load(f)

    registry: list[Cinema] = []
    for c_raw in raw_cinemas:
        name = c_raw["name"]
        city = c_raw["city"]
        group = c_raw["group"]

        cinema_info = mapping.get(name, {})
        allocine_id = cinema_info.get("id")
        if not allocine_id:
            slug = re.sub(r"[^a-z0-9]", "", name.lower())[:8]
            allocine_id = f"IND_{slug}"

        address = cinema_info.get("address", "")
        registry.append(Cinema(
            id=allocine_id,
            name=name,
            city=city,
            address=address,
            group_type=group,
            accepts_gold=c_raw.get("accepts_gold", True),
            accepts_silver=c_raw.get("accepts_silver", True),
            accepts_under26=c_raw.get("accepts_under26", True),
            is_pathe_network=("Pathé" in group or "Pathé" in name)
        ))

    return registry
