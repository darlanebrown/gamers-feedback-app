"""
Tests for POST /api/classify.
Covers: validation, rule-based path, AI path, and fallback when OpenAI fails.
"""
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
import pytest


def make_mock_pool():
    conn = AsyncMock()
    conn.execute = AsyncMock()
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=conn),
        __aexit__=AsyncMock(return_value=False),
    ))
    return pool, conn


VALID_BODY = {
    "reviewId": "r1",
    "headline": "Great open world",
    "body": "Elden Ring is a masterpiece with tight combat.",
    "pros": "Combat, world design",
    "cons": "Very difficult",
    "reviewerTag": "Gamer#1",
}


@pytest.mark.asyncio
async def test_missing_review_id_returns_400():
    from backend.main import app
    pool, _ = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/classify", json={"headline": "h", "body": "b"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_missing_headline_returns_422():
    from backend.main import app
    pool, _ = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/classify", json={"reviewId": "r1", "body": "b"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_rule_based_classifies_spam(monkeypatch):
    from backend.main import app
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    pool, conn = make_mock_pool()
    with patch("backend.main.pool", pool), \
         patch("backend.main.OPENAI_API_KEY", None):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/classify", json={
                **VALID_BODY,
                "headline": "Big discount giveaway",
                "body": "Use my promo code for free v-bucks",
            })
    assert res.status_code == 200
    data = res.json()
    assert data["classification"] == "spam"
    assert data["method"] == "rule-based"
    conn.execute.assert_called_once()


@pytest.mark.asyncio
async def test_rule_based_classifies_toxic(monkeypatch):
    from backend.main import app
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    pool, conn = make_mock_pool()
    with patch("backend.main.pool", pool), \
         patch("backend.main.OPENAI_API_KEY", None):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/classify", json={
                **VALID_BODY,
                "headline": "Garbage game",
                "body": "The devs are idiots who ruined everything",
            })
    data = res.json()
    assert data["classification"] == "toxic"
    assert data["method"] == "rule-based"


@pytest.mark.asyncio
async def test_rule_based_classifies_helpful(monkeypatch):
    from backend.main import app
    pool, conn = make_mock_pool()
    with patch("backend.main.pool", pool), \
         patch("backend.main.OPENAI_API_KEY", None):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/classify", json=VALID_BODY)
    data = res.json()
    assert data["classification"] == "helpful"
    assert data["method"] == "rule-based"


@pytest.mark.asyncio
async def test_ai_path_classifies_and_persists():
    from backend.main import app
    pool, conn = make_mock_pool()

    mock_chat = AsyncMock()
    mock_chat.completions.create = AsyncMock(return_value=MagicMock(
        choices=[MagicMock(message=MagicMock(
            content='{"classification": "helpful", "reason": "Genuine review."}'
        ))]
    ))
    mock_embed = AsyncMock()
    mock_embed.embeddings.create = AsyncMock(return_value=MagicMock(
        data=[MagicMock(embedding=[0.1] * 1536)]
    ))

    with patch("backend.main.pool", pool), \
         patch("backend.main.OPENAI_API_KEY", "sk-fake"), \
         patch("backend.main.AsyncOpenAI") as MockOAI:
        MockOAI.return_value = MagicMock(
            chat=mock_chat,
            embeddings=mock_embed.embeddings,
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/classify", json=VALID_BODY)

    assert res.status_code == 200
    data = res.json()
    assert data["classification"] == "helpful"
    assert data["method"] == "ai"


@pytest.mark.asyncio
async def test_openai_failure_falls_back_to_rule_based():
    from backend.main import app
    pool, conn = make_mock_pool()

    with patch("backend.main.pool", pool), \
         patch("backend.main.OPENAI_API_KEY", "sk-fake"), \
         patch("backend.main.AsyncOpenAI") as MockOAI:
        MockOAI.return_value.chat.completions.create = AsyncMock(
            side_effect=Exception("Auth error")
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/classify", json=VALID_BODY)

    assert res.status_code == 200
    assert res.json()["method"] == "rule-based-fallback"
