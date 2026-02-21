import postprocess


def test_soften_transitions_deterministic():
    text = "First paragraph.\n\nSecond paragraph starts here with a factual sentence."
    out1 = postprocess.soften_transitions(text, postprocess._seeded_random(text, 'standard'))
    out2 = postprocess.soften_transitions(text, postprocess._seeded_random(text, 'standard'))
    assert out1 == out2
    assert isinstance(out1, str)
