import postprocess


def test_limit_parallel_structure_rewrites_extra_not_just_patterns():
    s = "It's not just fast — it's simple. It's not just secure — it's human."
    out = postprocess.limit_parallel_structure(s)
    # ensure 'not just' occurs at most once
    assert out.lower().count('not just') <= 1
