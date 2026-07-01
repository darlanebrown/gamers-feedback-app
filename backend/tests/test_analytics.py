"""
Tests for GET /api/analytics/{title}
Developer analytics: sentiment score, counts, themes, bomb alert, trend.
"""
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
import datetime
import pytest


def make_review_row(rating: int, classification: str,
                    pros: str = "Great combat", cons: str = "Too hard",
                    week_offset: int = 0):
    base = datetime.datetime(2024, 1, 1)
    return {
        "id": "r1", "gameTitle": "Elden Ring", "platform": "PC",
        "rating": rating, "headline": "A review",
        "body": "This is my review body.",
        "pros": pros, "cons": cons, "playtime": "50h",
        "reviewerTag": "Gamer#1", "classification": classification,
        "classificationReason": None,
        "createdAt": base + datetime.timedelta(weeks=week_offset),
    }


def make_mock_pool(rows: list):
    conn = AsyncMock()
    conn.fetch = AsyncMock(return_value=rows)
    conn.fetchval = AsyncMock(return_value=0)  # bomb count = 0
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=conn),
        __aexit__=AsyncMock(return_value=False),
    ))
    return pool, conn


@pytest.mark.asyncio
async def test_analytics_response_shape():
    from backend.main import app
    rows = [
        make_review_row(9, "helpful"),
        make_review_row(8, "helpful"),
        make_review_row(3, "spam"),
    ]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/analytics/Elden Ring")
    assert res.status_code == 200
    data = res.json()
    required = [
        "gameTitle", "totalReviews", "helpfulCount", "spamCount",
        "toxicCount", "sentimentScore", "topPros", "topCons",
        "bombAlert", "trend",
    ]
    for field in required:
        assert field in data, f"Missing field: {field}"


@pytest.mark.asyncio
async def test_counts_are_accurate():
    from backend.main import app
    rows = [
        make_review_row(9, "helpful"),
        make_review_row(8, "helpful"),
        make_review_row(1, "spam"),
        make_review_row(2, "toxic"),
    ]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/analytics/Elden Ring")
    data = res.json()
    assert data["totalReviews"] == 4
    assert data["helpfulCount"] == 2
    assert data["spamCount"] == 1
    assert data["toxicCount"] == 1


@pytest.mark.asyncio
async def test_sentiment_score_is_avg_helpful_rating():
    from backend.main import app
    rows = [
        make_review_row(8, "helpful"),
        make_review_row(6, "helpful"),
    ]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/analytics/Elden Ring")
    data = res.json()
    assert data["sentimentScore"] == 7.0


@pytest.mark.asyncio
async def test_no_helpful_reviews_sentiment_is_none():
    from backend.main import app
    rows = [make_review_row(1, "spam")]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/analytics/Elden Ring")
    data = res.json()
    assert data["sentimentScore"] is None


@pytest.mark.asyncio
async def test_top_pros_and_cons_are_lists():
    from backend.main import app
    rows = [
        make_review_row(9, "helpful", pros="Great combat, beautiful world", cons="Too hard"),
        make_review_row(8, "helpful", pros="Great combat, long campaign", cons="Performance issues"),
    ]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/analytics/Elden Ring")
    data = res.json()
    assert isinstance(data["topPros"], list)
    assert isinstance(data["topCons"], list)


@pytest.mark.asyncio
async def test_bomb_alert_flag_included():
    from backend.main import app
    rows = [make_review_row(9, "helpful")]
    pool, conn = make_mock_pool(rows)
    conn.fetchval = AsyncMock(return_value=0)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/analytics/Elden Ring")
    data = res.json()
    assert data["bombAlert"] is False


@pytest.mark.asyncio
async def test_no_reviews_returns_zeros():
    from backend.main import app
    pool, _ = make_mock_pool([])
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/analytics/Unknown Game")
    data = res.json()
    assert data["totalReviews"] == 0
    assert data["sentimentScore"] is None
