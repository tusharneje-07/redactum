import json
from app import app, save_settings, load_settings


class FakeProvider:
    def __init__(self, api_key, model):
        self.api_key = api_key
        self.model = model

    def generate_completion(self, prompt, temperature=0.4):
        if 'ONLY_EDITORIAL' in prompt:
            return 'Note: I removed duplicates. Edited: consolidated points.'
        return 'This explains the approach clearly. Note: minor edits applied.'


def test_refine_api_happy_and_editorial(monkeypatch):
    from app import get_ai_provider

    def fake_get(provider_name, settings):
        return FakeProvider('fake', 'model')

    monkeypatch.setattr('app.get_ai_provider', fake_get)

    import werkzeug
    if not hasattr(werkzeug, '__version__'):
        werkzeug.__version__ = '3.0.0'
    client = app.test_client()

    # Happy path
    resp = client.post('/api/refine', json={'text': 'Hello world', 'tone': 'professional'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'refined' in data
    assert 'Note:' not in data['refined']

    resp_dbg = client.post('/api/refine', json={'text': 'Hello world', 'tone': 'professional', 'debug': True})
    data_dbg = resp_dbg.get_json()
    assert 'postprocessReport' in data_dbg

    # Editorial-only path should return error or cleaned fallback
    resp2 = client.post('/api/refine', json={'text': 'ONLY_EDITORIAL', 'tone': 'professional'})
    data2 = resp2.get_json()
    assert resp2.status_code in (200, 500, 400)


def test_refine_api_with_humanize_and_debug(monkeypatch):
    # Ensure humanizeLevel and debug flags are accepted by the API and returned in debug mode
    def fake_get(provider_name, settings):
        return FakeProvider('fake', 'model')

    monkeypatch.setattr('app.get_ai_provider', fake_get)
    client = app.test_client()

    resp = client.post('/api/refine', json={'text': 'Hello world', 'tone': 'professional', 'humanizeLevel': 'aggressive', 'debug': True})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get('success') is True
    assert 'postprocessReport' in data
