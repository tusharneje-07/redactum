import postprocess


def test_fix_three_item_lists_merges_last_two():
    s = "- Fast\n- Secure\n- Reliable\n"
    out = postprocess.fix_three_item_lists(s)
    assert '- Fast' in out
    assert 'Secure and Reliable' in out or 'secure and reliable' in out.lower()
