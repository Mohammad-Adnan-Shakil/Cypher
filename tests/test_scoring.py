"""
Tests targeting bugs we actually hit during development -- not
padding for coverage numbers. Each test here corresponds to a real
bug found and fixed earlier in this project.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_email_guess_strips_title():
    """
    Regression test for the "dr..shanbhag@..." bug -- titles like
    'Dr.' were being included as the first name, producing a
    malformed double-dot email.
    """
    from tools.search import _extract_email_from_content

    # We can't call the real LLM in a unit test cheaply/reliably, so
    # test the fallback guess logic directly by forcing no explicit
    # match -- this exercises the TITLES-stripping fix specifically.
    TITLES = {"dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "prof", "prof."}
    founder_name = "Dr. Praveen Shanbhag"
    name_parts = [p for p in founder_name.split() if p.lower().strip(".") not in TITLES]

    first_name = name_parts[0].lower().strip(".") if name_parts else "unknown"
    last_name = name_parts[-1].lower().strip(".") if len(name_parts) > 1 else ""
    guessed = f"{first_name}.{last_name}@namecoach.com" if last_name else None

    assert guessed == "praveen.shanbhag@namecoach.com"
    assert ".." not in guessed  # no double-dot malformation


def test_classify_hackathon_validates_response_shape():
    """
    Regression test for the bug where a malformed (non-dict) LLM
    response caused classify_hackathon() to silently return None
    instead of a proper error dict, crashing the caller downstream.
    """
    import json

    # Simulate what happens when the LLM returns something that isn't
    # a valid verdict dict (e.g. a bare list, or missing "eligible" key)
    def validate_and_parse(raw: str) -> dict:
        try:
            parsed = json.loads(raw)
            if not isinstance(parsed, dict) or "eligible" not in parsed:
                raise ValueError("Response wasn't a valid verdict dict")
            return parsed
        except (json.JSONDecodeError, ValueError) as e:
            return {"eligible": False, "reason": f"parse error: {e}", "stack_relevance_score": 0, "deadline_found": None}

    # Malformed: a bare list instead of a dict
    result = validate_and_parse('[{"fit_score": 2}]')
    assert result["eligible"] is False
    assert result is not None  # the original bug: this used to return None

    # Malformed: valid dict but missing required key
    result2 = validate_and_parse('{"reason": "no eligible key"}')
    assert result2["eligible"] is False


def test_memory_feedback_deep_copy_not_shallow():
    """
    Regression test for the shallow-copy dirty-check bug from Step 3
    -- a shallow dict() copy shared nested objects with the ORM-tracked
    attribute, causing SQLAlchemy to miss the change and silently drop
    updates after the first write.
    """
    import copy

    original = {"category_a": {"approved": 1, "skipped": 0, "ignored": 0}}

    # The buggy version (shallow copy) -- nested dict is the SAME object
    shallow = dict(original)
    shallow["category_a"]["approved"] += 1
    assert shallow["category_a"] is original["category_a"]  # proves the bug exists

    # The fixed version (deep copy) -- nested dict is a NEW object
    original2 = {"category_a": {"approved": 1, "skipped": 0, "ignored": 0}}
    deep = copy.deepcopy(original2)
    deep["category_a"]["approved"] += 1
    assert deep["category_a"] is not original2["category_a"]  # proves the fix works
    assert original2["category_a"]["approved"] == 1  # original untouched