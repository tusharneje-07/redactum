import postprocess


def test_remove_editorial_notes_removes_note_lines():
    s = "Note: I removed the old section.\nThis is the content."
    out = postprocess.remove_editorial_notes(s)
    assert 'Note:' not in out
    assert 'This is the content.' in out
