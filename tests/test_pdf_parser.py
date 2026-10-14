import pytest
from pathlib import Path
from cinepass_planner.importer.pdf_parser import extract_cinemas_from_pdf, load_or_build_cinema_registry
from cinepass_planner.config import DEFAULT_PDF_PATH, DEFAULT_MAPPING_PATH

def test_extract_cinemas_from_official_pdf():
    pdf_path = DEFAULT_PDF_PATH
    if not pdf_path.exists():
        pytest.skip("pathe_cinemas.pdf non présent localement")
    cinemas = extract_cinemas_from_pdf(pdf_path)
    assert len(cinemas) >= 100
    names = [c["name"] for c in cinemas]
    assert any("Alésia" in name for name in names)
    assert any("Belle Epine" in name for name in names)
    assert any("Mazarin" in name for name in names)

def test_cinema_registry_has_allocine_ids():
    pdf_path = DEFAULT_PDF_PATH
    mapping_path = DEFAULT_MAPPING_PATH
    if not pdf_path.exists():
        pytest.skip("pathe_cinemas.pdf non présent localement")
    registry = load_or_build_cinema_registry(pdf_path, mapping_path)
    assert len(registry) >= 100
    for c in registry:
        assert c.id is not None and len(c.id) >= 3
        assert c.name is not None and len(c.name) > 0
