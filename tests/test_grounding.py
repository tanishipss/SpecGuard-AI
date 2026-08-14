from backend.generation.grounding import check_grounding


class FakeClient:
    def __init__(self, json_response=None, raise_on_call=False):
        self._json_response = json_response
        self._raise_on_call = raise_on_call

    def generate(self, system_prompt, question):
        raise NotImplementedError

    def generate_json(self, prompt):
        if self._raise_on_call:
            raise ValueError("simulated malformed response")
        return self._json_response


def test_pass_verdict_is_returned():
    client = FakeClient(json_response={"verdict": "pass", "unsupported_claims": []})
    verdict = check_grounding(client, "answer", [])
    assert verdict.verdict == "pass"
    assert verdict.unsupported_claims == []


def test_fail_verdict_carries_unsupported_claims():
    client = FakeClient(json_response={"verdict": "fail", "unsupported_claims": ["claim X is not in context"]})
    verdict = check_grounding(client, "answer", [])
    assert verdict.verdict == "fail"
    assert verdict.unsupported_claims == ["claim X is not in context"]


def test_unparseable_response_fails_closed():
    client = FakeClient(raise_on_call=True)
    verdict = check_grounding(client, "answer", [])
    assert verdict.verdict == "fail"


def test_unexpected_verdict_value_fails_closed():
    client = FakeClient(json_response={"verdict": "maybe", "unsupported_claims": []})
    verdict = check_grounding(client, "answer", [])
    assert verdict.verdict == "fail"


def test_missing_unsupported_claims_key_defaults_to_empty():
    client = FakeClient(json_response={"verdict": "pass"})
    verdict = check_grounding(client, "answer", [])
    assert verdict.unsupported_claims == []
