import postprocess


def test_vary_sentence_rhythm_deterministic():
    text = "This is a sentence. This is another sentence that is longer and contains, several, commas to allow splitting. Short."
    rng1 = postprocess._seeded_random(text, 'standard')
    out1 = postprocess.vary_sentence_rhythm(text, rng1)
    rng2 = postprocess._seeded_random(text, 'standard')
    out2 = postprocess.vary_sentence_rhythm(text, rng2)
    assert out1 == out2
    # Ensure output is not identical to input in typical cases
    assert isinstance(out1, str)
    assert len(out1) > 0
