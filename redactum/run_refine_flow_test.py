#!/usr/bin/env python3
"""Simple test runner that imports the Flask app and uses test_client to
simulate the refine flow with humanizeLevel and debug flags. This is intended
for local developer checks and CI smoke tests.
"""
import sys
import os
import json

# Ensure we can import the web backend (redactum-web) by adding its path
HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.normpath(os.path.join(HERE, '..', 'redactum-web'))
if WEB not in sys.path:
    sys.path.insert(0, WEB)

from app import app, save_settings, load_settings


def run():
    # Ensure settings has a dummy provider configured so get_ai_provider returns None
    settings = load_settings()
    settings['providers']['openai']['apiKey'] = 'sk-test'
    settings['activeProvider'] = 'openai'
    save_settings(settings)

    # Monkeypatch provider via a simple import-time swap. We avoid complex
    # mocking frameworks here so the script remains portable.
    class FakeProvider:
        def generate_completion(self, prompt, temperature=0.4):
            return "Note: I updated this. This product is innovative and seamless. - Fast\n- Secure\n- Reliable"

    # Inject into module namespace used by app.get_ai_provider
    import types
    import app as appmod
    # Some environments install a werkzeug without __version__; ensure a value exists
    import werkzeug
    if not hasattr(werkzeug, '__version__'):
        werkzeug.__version__ = '3.0.0'
    appmod.get_ai_provider = lambda name, s: FakeProvider()

    client = app.test_client()
    # Simulate the web UI: GET /api/settings, POST /api/settings to configure provider
    gs = client.get('/api/settings')
    print('GET /api/settings status', gs.status_code)
    # POST settings: configure provider apiKey and UI flags
    payload_settings = {
        'provider': 'openai',
        'apiKey': 'sk-test',
        'humanizeLevel': 'aggressive',
        'debug': True
    }
    ps = client.post('/api/settings', json=payload_settings)
    print('POST /api/settings status', ps.status_code)

    # Now call refine as the web UI would
    payload = {
        'text': 'draft',
        'tone': 'professional',
        'humanizeLevel': 'aggressive',
        'debug': True
    }
    resp = client.post('/api/refine', json=payload)
    print('Status:', resp.status_code)
    try:
        print(json.dumps(resp.get_json(), indent=2))
    except Exception:
        print(resp.data)


if __name__ == '__main__':
    run()
