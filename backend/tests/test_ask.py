"""
Tests for POST /api/ask — the RAG endpoint.
Locks down the contract: what the endpoint must accept, return, and do.
"""
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
import datetime
import pytest


def make_mock_pool(rows=None):
    conn = AsyncMock()
    conn.fetch = AsyncMock(return_value=rows or [])
    conn.execute = AsyncMock()
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=conn),
        __aexit__=AsyncMock(return_value=False),
    ))
    return pool, conn


SOURCE_ROW = {
    "id": "r1",
    "gameTitle": "Elden Ring",
    "headline": "A masterpiece",
    "body": "Stunning open world with incredible boss fights.",
    "pros": "Combat, world design",
    "cons": "Very difficult",
    "rating": 9,
    "reviewerTag": "Gamer#1",
}


@pytest.mark.asyncio
async def test_ask_requires_question():
    from backend.main import app
    pool, _ = make_mock_pool()
    with patch("backend.main.pool", pool), \
         patch("backend.main.OPENAI_API_KEY", "sk-fake"):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/ask", json={})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_ask_returns_503_without_openai_key():
    from backend.main import app
    pool, _ = make_mock_pool()
    with patch("backend.main.pool", pool), \
         patch("backend.main.OPENAI_API_KEY", None):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/ask", json={"question": "Is Elden Ring good?"})
    assert res.status_code == 503


@pytest.mark.asyncio
async def test_ask_returns_friendly_message_when_no_embeddings():
    from backend.main import app
    pool, _ = make_mock_pool(rows=[])  # no reviews with embeddings yet

    with patch("backend.main.pool", pool), \
         patch("backend.main.OPENAI_API_KEY", "sk-fake"), \
         patch("backend.main.AsyncOpenAI") as MockOAI:
        MockOAI.return_value.embeddings.create = AsyncMock(return_value=MagicMock(
            data=[MagicMock(embedding=[0.1] * 1536)]
        ))
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/ask", json={"question": "Is Elden Ring good?"})

    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert data["sources"] == []


@pytest.mark.asyncio
async def test_ask_returns_answer_and_sources():
    from backend.main import app
    pool, _ = make_mock_pool(rows=[SOURCE_ROW])

    with patch("backend.main.pool", pool), \
         patch("backend.main.OPENAI_API_KEY", "sk-fake"), \
         patch("backend.main.AsyncOpenAI") as MockOAI:
        instance = MockOAI.return_value
        instance.embeddings.create = AsyncMock(return_value=MagicMock(
            data=[MagicMock(embedding=[0.1] * 1536)]
        ))
        instance.chat.completions.create = AsyncMock(return_value=MagicMock(
            choices=[MagicMock(message=MagicMock(
                content="Yes, Elden Ring is highly recommended based on player reviews."
            ))]
        ))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/ask", json={"question": "Is Elden Ring worth it?"})

    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "sources" in data
    assert len(data["sources"]) == 1
    assert data["sources"][0]["gameTitle"] == "Elden Ring"
    assert data["sources"][0]["rating"] == 9


@pytest.mark.asyncio
async def test_ask_embeds_question_before_searching():
    """The question must be embedded before the pgvector similarity search."""
    from backend.main import app
    pool, conn = make_mock_pool(rows=[SOURCE_ROW])

    with patch("backend.main.pool", pool), \
         patch("backend.main.OPENAI_API_KEY", "sk-fake"), \
         patch("backend.main.AsyncOpenAI") as MockOAI:
        instance = MockOAI.return_value
        instance.embeddings.create = AsyncMock(return_value=MagicMock(
            data=[MagicMock(embedding=[0.42] * 1536)]
        ))
        instance.chat.completions.create = AsyncMock(return_value=MagicMock(
            choices=[MagicMock(message=MagicMock(content="Great game."))]
        ))

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post("/api/ask", json={"question": "Is Elden Ring worth it?"})

    # Embedding was called once for the question
    instance.embeddings.create.assert_called_once()
    # DB was queried with the embedding vector
    conn.fetch.assert_called_once()
    query_arg = conn.fetch.call_args[0][0]
    assert "embedding" in query_arg
