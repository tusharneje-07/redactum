import postprocess


def test_limit_em_dashes_rewrites_excess_emdash():
    # build a text ~600 words with 3 em dashes to force replacement
    piece = "word " * 600
    text = f"Start — middle — another — end"
    out = postprocess.limit_em_dashes(text)
    # count em dashes in output should be <= allowed (words//500 => 1)
    assert out.count('—') <= 1
