import pytest
from pydantic import ValidationError

from backend.api.schemas import ChatRequest
from backend.config import settings


def test_chat_request_accepts_a_normal_question():
    req = ChatRequest(question="What is the AMF?")
    assert req.question == "What is the AMF?"
    assert req.top_k is None


def test_chat_request_rejects_empty_question():
    with pytest.raises(ValidationError):
        ChatRequest(question="")


def test_chat_request_rejects_question_over_max_length():
    too_long = "a" * (settings.max_question_length + 1)
    with pytest.raises(ValidationError):
        ChatRequest(question=too_long)


def test_chat_request_rejects_top_k_out_of_range():
    with pytest.raises(ValidationError):
        ChatRequest(question="q", top_k=0)
    with pytest.raises(ValidationError):
        ChatRequest(question="q", top_k=21)


def test_chat_request_accepts_top_k_in_range():
    req = ChatRequest(question="q", top_k=5)
    assert req.top_k == 5
