import postprocess


def test_replace_banned_words_replaces_listed_terms():
    s = "This product is innovative and seamless. We will leverage it to elevate the UX."
    out = postprocess.replace_banned_words(s)
    out_l = out.lower()
    # banned words should not appear
    assert 'innovative' not in out_l
    assert 'seamless' not in out_l
    assert 'leverage' not in out_l
    assert 'elevate' not in out_l
    # replacements present
    assert 'new' in out_l or 'advanced' in out_l
