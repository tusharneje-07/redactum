import postprocess


def test_apply_contractions_deterministic():
    text = "It is likely that we do not need further changes. I am sure."
    rng1 = postprocess._seeded_random(text, 'standard')
    out1 = postprocess.apply_contractions(text, rng1)
    rng2 = postprocess._seeded_random(text, 'standard')
    out2 = postprocess.apply_contractions(text, rng2)
    assert out1 == out2

def test_apply_contractions_different_aggressiveness_changes_output():
    text = "It is likely that we do not need further changes. I am sure."
    out_std = postprocess.apply_contractions(text, postprocess._seeded_random(text, 'standard'))
    out_agg = postprocess.apply_contractions(text, postprocess._seeded_random(text, 'aggressive'))
    assert out_std != out_agg
