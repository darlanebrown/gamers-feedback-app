"""
Tests for GET /api/profile/{tag}
Returns reputation score, badge, stats, and recent reviews for a gamer tag.
"""
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
import datetime
import pytest


def make_review_row(classification: str = "helpful", rating: int = 8):
    return {
        "id": "r1", "gameTitle": "Hades", "platform": "PC",
        "rating": rating, "headline": "Great game",
        "body": "Really loved this.",
        "pros": "Combat", "cons": "Repetitive", "playtime": "80h",
        "reviewerTag": "Darla#1", "classification": classification,
        "classificationReason": None,
        "createdAt": datetime.datetime(2024, 1, 1),
    }


def make_mock_pool(rows: list):
    conn = AsyncMock()
    conn.fetch = AsyncMock(return_value=rows)
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=conn),
        __aexit__=AsyncMock(return_value=False),
    ))
    return pool


@pytest.mark.asyncio
async def test_profile_response_shape():
    from backend.main import app
    pool = make_mock_pool([make_review_row("helpful", 9)])
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/profile/Darla%231")
    assert res.status_code == 200
    data = res.json()
    assert "gamerTag" in data
    assert "reputation" in data
    assert "stats" in data
    assert "reviews" in data


@pytest.mark.asyncio
async def test_gold_badge_all_helpful():
    from backend.main import app
    rows = [make_review_row("helpful") for _ in range(5)]
    pool = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/profile/Darla%231")
    data = res.json()
    assert data["reputation"]["badge"] == "Gold"
    assert data["reputation"]["score"] == 100


@pytest.mark.asyncio
async def test_silver_badge():
    from backend.main import app
    rows = [
        make_review_row("helpful"),
        make_review_row("helpful"),
        make_review_row("spam"),
    ]
    pool = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/profile/Darla%231")
    data = res.json()
    assert data["reputation"]["badge"] == "Silver"
    assert round(data["reputation"]["score"]) == 67


@pytest.mark.asyncio
async def test_bronze_badge():
    from backend.main import app
    rows = [
        make_review_row("helpful"),
        make_review_row("spam"),
        make_review_row("toxic"),
    ]
    pool = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/profile/Darla%231")
    data = res.json()
    assert data["reputation"]["badge"] == "Bronze"


@pytest.mark.asyncio
async def test_no_reviews_returns_zeros():
    from backend.main import app
    pool = make_mock_pool([])
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/profile/Ghost%231")
    data = res.json()
    assert data["reputation"]["score"] == 0
    assert data["reputation"]["badge"] is None
    assert data["stats"]["total"] == 0


@pytest.mark.asyncio
async def test_avg_rating_uses_helpful_only():
    from backend.main import app
    rows = [
        make_review_row("helpful", rating=10),
        make_review_row("helpful", rating=8),
        make_review_row("spam", rating=1),
    ]
    pool = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/profile/Darla%231")
    data = res.json()
    assert data["stats"]["avgRating"] == 9.0
