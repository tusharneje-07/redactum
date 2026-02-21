import json
import os
import tempfile
import werkzeug
# Some environments install werkzeug without __version__; ensure it's present for Flask test_client
if not hasattr(werkzeug, '__version__'):
    werkzeug.__version__ = '3.0.0'
from app import app, save_settings, load_settings


def test_refine_respects_humanizeLevel_and_debug(monkeypatch):
    # Mock provider to return a string containing banned words and editorial notes
    class FakeProvider:
        def generate_completion(self, prompt, temperature=0.4):
            return "Note: I updated this. This product is innovative and seamless. - Fast\n- Secure\n- Reliable"

    settings = load_settings()
    # inject fake provider via monkeypatch
    monkeypatch.setattr('app.get_ai_provider', lambda name, s: FakeProvider())

    client = app.test_client()
    payload = {
        'text': 'draft',
        'tone': 'professional',
        'humanizeLevel': 'aggressive',
        'debug': True
    }
    resp = client.post('/api/refine', json=payload)
    data = json.loads(resp.data)
    assert data['success'] is True
    assert 'postprocessReport' in data
    assert 'banned_word_replacements' in data['postprocessReport']
    # refined text should not contain 'Note:' or banned words
    assert 'Note:' not in data['refined']
    assert 'innovative' not in data['refined'].lower()
