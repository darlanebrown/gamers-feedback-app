"""
Tests for GET /api/reviews and POST /api/reviews.
DB pool is mocked — no real database needed.
"""
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
import pytest


FAKE_ROW = {
    "id": "r1",
    "gameTitle": "Hades",
    "platform": "PC",
    "rating": 9,
    "headline": "Roguelike perfection",
    "body": "Every run feels fresh.",
    "pros": "Tight gameplay",
    "cons": "Repetitive music",
    "playtime": "80 hours",
    "reviewerTag": "Player#99",
    "classification": "helpful",
    "classificationReason": "Genuine review",
    "createdAt": __import__("datetime").datetime(2024, 1, 1),
    "embedding": None,
}


def make_mock_pool(rows=None, created_row=None):
    conn = AsyncMock()
    conn.fetch = AsyncMock(return_value=rows or [])
    conn.fetchrow = AsyncMock(return_value=created_row or FAKE_ROW)
    conn.execute = AsyncMock()
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=conn),
        __aexit__=AsyncMock(return_value=False),
    ))
    return pool, conn


@pytest.fixture
def app_with_mock_pool():
    from backend.main import app
    pool, conn = make_mock_pool(rows=[FAKE_ROW])
    with patch("backend.main.pool", pool):
        yield app, pool, conn


@pytest.mark.asyncio
async def test_get_all_reviews(app_with_mock_pool):
    app, pool, conn = app_with_mock_pool
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/reviews")
    assert res.status_code == 200
    data = res.json()
    assert len(data["reviews"]) == 1
    assert data["reviews"][0]["gameTitle"] == "Hades"


@pytest.mark.asyncio
async def test_get_reviews_filter_helpful(app_with_mock_pool):
    app, pool, conn = app_with_mock_pool
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/reviews?filter=helpful")
    assert res.status_code == 200
    # verify the SQL contains 'helpful'
    call_args = conn.fetch.call_args[0][0]
    assert "helpful" in call_args


@pytest.mark.asyncio
async def test_get_reviews_search_by_game(app_with_mock_pool):
    app, pool, conn = app_with_mock_pool
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/reviews?game=Hades")
    assert res.status_code == 200
    call_args = conn.fetch.call_args[0]
    assert "%Hades%" in call_args or "Hades" in str(call_args)


@pytest.mark.asyncio
async def test_post_review_returns_201():
    from backend.main import app
    pending_row = {**FAKE_ROW, "classification": "pending", "classificationReason": None}
    pool, conn = make_mock_pool(created_row=pending_row)
    conn.fetchrow = AsyncMock(return_value=pending_row)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/reviews", json={
                "gameTitle": "Hades",
                "platform": "PC",
                "rating": 9,
                "headline": "Roguelike perfection",
                "body": "Every run feels fresh.",
                "pros": "Tight gameplay",
                "cons": "Repetitive music",
                "playtime": "80 hours",
                "reviewerTag": "Player#99",
            })
    assert res.status_code == 201
    assert res.json()["review"]["classification"] == "pending"


@pytest.mark.asyncio
async def test_post_review_requires_required_fields():
    from backend.main import app
    pool, _ = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/reviews", json={"gameTitle": "Hades"})
    assert res.status_code == 422
