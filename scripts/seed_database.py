import logging
import sys
from pathlib import Path

# Add src to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "src"))

from cinepass_planner.config import DEFAULT_DB_PATH, DEFAULT_PDF_PATH, DEFAULT_MAPPING_PATH
from cinepass_planner.db.connection import get_db_connection
from cinepass_planner.db.schema import init_db
from cinepass_planner.db.repositories import CinemaRepository
from cinepass_planner.importer.pdf_parser import load_or_build_cinema_registry

def main():
    logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
    logger = logging.getLogger("seed_database")

    logger.info("Initialisation de la base de données CinéPass Planner...")
    conn = get_db_connection(DEFAULT_DB_PATH)
    init_db(conn)
    repo = CinemaRepository(conn)

    logger.info(f"Lecture du document officiel : {DEFAULT_PDF_PATH}")
    registry = load_or_build_cinema_registry(DEFAULT_PDF_PATH, DEFAULT_MAPPING_PATH)
    logger.info(f"Extraction de {len(registry)} cinémas du réseau CinéPass.")

    with conn:
        conn.execute("DELETE FROM cinemas WHERE id LIKE 'IND_%'")

    for cinema in registry:
        repo.save(cinema)

    total = len(repo.list_all())
    logger.info(f"Base de données initialisée avec succès dans {DEFAULT_DB_PATH} ({total} cinémas enregistrés).")

if __name__ == "__main__":
    main()
