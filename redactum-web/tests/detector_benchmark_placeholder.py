"""Detector benchmark placeholder (opt-in).

Skeleton harness for opt-in detector tests. This module intentionally contains
no network calls and will skip execution when no detector credentials are
provided. It exists to make opt-in benchmarking reproducible and explicit.
"""
import os
import json
import pytest


def test_detector_benchmark_placeholder():
    api_key = os.environ.get('DETECTOR_API_KEY')
    if not api_key:
        pytest.skip('Detector credentials not provided; opt-in test skipped')

    assert True
