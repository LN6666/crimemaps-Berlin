"""The exact Google response survives builds without exempting arbitrary HTML."""
import sys
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/migration"))
sys.path.insert(0, str(ROOT / "scripts/security"))
from artifact_gate import scan
from site_discovery import build

TOKEN = "google73948d3ce3a710e9.html"
RESPONSE = b"google-site-verification: google73948d3ce3a710e9.html"
HTML = '<!doctype html><html><head><title>CrimeMaps</title><meta http-equiv="Content-Security-Policy" content="script-src &#39;self&#39;; object-src &#39;none&#39;; base-uri &#39;none&#39;"></head><body><div id="app"></div><footer></footer></body></html>'


def test_berlin_generator_retains_exact_public_build_token(tmp_path):
    (tmp_path / "index.html").write_text(HTML)
    (tmp_path / "map").mkdir()
    (tmp_path / "map/index.html").write_text(HTML)
    result = build(tmp_path, "berlin", ROOT / "config/discovery-cities.json")
    assert (ROOT / "web/public" / TOKEN).read_bytes() == RESPONSE
    assert (tmp_path / TOKEN).read_bytes() == RESPONSE
    assert TOKEN in result["changed_files"]
    assert scan(tmp_path, "berlin", "a" * 40)["files"][TOKEN]["bytes"] == 53
    (tmp_path / TOKEN).write_bytes(RESPONSE + b"<script>alert(1)</script>")
    with pytest.raises(ValueError):
        scan(tmp_path, "berlin", "a" * 40)


@pytest.mark.parametrize("city,name", [("essen", TOKEN), ("berlin", "other.html"), ("berlin", "nested/" + TOKEN)])
def test_token_exception_does_not_extend_to_other_city_or_path(tmp_path, city, name):
    (tmp_path / "index.html").write_text(HTML)
    target = tmp_path / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(RESPONSE)
    with pytest.raises(ValueError, match="missing CSP"):
        scan(tmp_path, city, "a" * 40)
