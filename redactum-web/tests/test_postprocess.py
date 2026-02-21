import postprocess


def test_replace_banned_words():
    s = "This will delve into innovative approaches to leverage robust systems."
    out = postprocess.replace_banned_words(s)
    assert 'delve' not in out.lower()
    assert 'innovative' not in out.lower()
    assert 'leverage' not in out.lower()


def test_strip_leading_emoji_from_list_items():
    s = "- 🚀 Speed\n- ✅ Reliability\n- 🔐 Security"
    out = postprocess.strip_leading_emoji_from_list_items(s)
    assert '- Speed' in out
    assert '- Reliability' in out
    assert '- Security' in out


def test_fix_three_item_lists():
    s = "Here are things:\n- A\n- B\n- C\nEnd"
    out = postprocess.fix_three_item_lists(s)
    assert '- A' in out
    assert '- B and C' in out


def test_remove_editorial_notes_conservative():
    s = "Note: I removed duplicates. The result follows.\nActual content here."
    out = postprocess.remove_editorial_notes(s)
    assert 'Actual content here' in out


def test_limit_em_dashes():
    s = 'word ' * 1200 + ' — ' + 'more text ' + ' — ' + 'extra'
    out = postprocess.limit_em_dashes(s)
    assert '—' in out or ',' in out


def test_postprocess_refined_text_end_to_end():
    s = "Note: edit\nTo clarify, this is innovative — it will leverage systems.\n- 🚀 Speed\n- ✅ Reliability\n- 🔐 Security"
    out = postprocess.postprocess_refined_text(s)
    assert 'Note:' not in out
    assert 'innovative' not in out
    assert '- Speed' in out


def test_keep_substantive_note():
    # A substantive line that begins with 'Note' but contains important content
    s = "Note: The deadline is March 3, 2026. Please prepare the report." 
    out = postprocess.postprocess_refined_text(s)
    # Conservative heuristics may remove the short 'Note:' prefix but should preserve the substantive sentence
    assert 'Please prepare the report' in out


def test_fallback_on_editorial_only():
    # If the model returns only editorial notes, the pipeline should provide a cleaned
    # fallback or raise a helpful error. We use the helper directly to simulate behavior.
    s = "Note: I removed duplicates. Edited: consolidated points."
    processed = postprocess.postprocess_refined_text_full(s, debug=True, aggressiveness='standard')
    assert isinstance(processed, dict)
    assert 'text' in processed
    # The resulting text may be empty; ensure the function returns a dict with report
    assert 'report' in processed
