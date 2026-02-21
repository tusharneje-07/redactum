import json
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.normpath(os.path.join(HERE, '..', 'redactum-web'))
if WEB not in sys.path:
    sys.path.insert(0, WEB)
try:
    from postprocess import postprocess_refined_text_full
except Exception:
    # Fall back to importing via package path when tests run from different cwd
    import importlib.util
    spec = importlib.util.spec_from_file_location('postprocess', os.path.join(WEB, 'postprocess.py'))
    postprocess = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(postprocess)
    postprocess_refined_text_full = postprocess.postprocess_refined_text_full


def test_aggressiveness_deterministic_once():
    text = "This is a long sentence, it contains many clauses, and will be used to test rhythm variation. " * 3
    r1 = postprocess_refined_text_full(text, debug=True, aggressiveness='aggressive')
    r2 = postprocess_refined_text_full(text, debug=True, aggressiveness='aggressive')
    assert r1['text'] == r2['text']
    # Transform may or may not apply depending on text content; determinism is required
    assert isinstance(r1['text'], str)


def test_aggressiveness_applies_contractions_when_possible():
    # This input includes phrases that should be contracted deterministically
    text = "Do not worry. We are testing this. I have done what is needed. It is clear."
    r = postprocess_refined_text_full(text, debug=True, aggressiveness='aggressive')
    # Contractions should be applied for aggressive mode
    assert 'contractions_applied' in r['report']
    assert r['report']['contractions_applied'] >= 1
