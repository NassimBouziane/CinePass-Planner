from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DEFAULT_DB_PATH = DATA_DIR / "cinepass.db"
DEFAULT_PDF_PATH = BASE_DIR / "pathe_cinemas.pdf"
DEFAULT_MAPPING_PATH = DATA_DIR / "cinemas_mapping.json"

# Scheduler Defaults
DEFAULT_BUFFER_MINUTES = 15
DEFAULT_MEAL_PAUSE_MINUTES = 60
DEFAULT_FALLBACK_RUNTIME_MINUTES = 120

# Pass Types
ALLOCINE_PATHE_CIRCUIT_ID = "circuit-81002"
