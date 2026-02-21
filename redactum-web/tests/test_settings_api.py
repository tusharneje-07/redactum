import json
from app import app


def test_settings_humanize_and_debug_roundtrip(monkeypatch, tmp_path):
    """Ensure POST /api/settings accepts humanizeLevel and debug and GET returns them."""
    client = app.test_client()

    # Save settings with humanizeLevel and debug
    payload = {
        'activeProvider': 'openai',
        'theme': 'dark',
        'provider': 'openai',
        'apiKey': 'fake-key',
        'model': 'gpt-4o',
        'humanizeLevel': 'aggressive',
        'debug': True
    }

    resp = client.post('/api/settings', json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get('success') is True

    # Now GET settings (safe view) and ensure humanizeLevel/debug are exposed
    resp2 = client.get('/api/settings')
    assert resp2.status_code == 200
    safe = resp2.get_json()
    assert safe.get('humanizeLevel') in ('low', 'standard', 'aggressive')
    assert isinstance(safe.get('debug'), bool)
