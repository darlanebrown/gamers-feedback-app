"""
Tests for GET /api/games/{title}/trends
Groups helpful reviews by week, detects improving/declining/stable trend.
"""
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
import datetime
import pytest


def make_week_row(week_offset: int, avg_rating: float, count: int):
    base = datetime.datetime(2024, 1, 1)
    return {
        "week": base + datetime.timedelta(weeks=week_offset),
        "avg_rating": avg_rating,
        "review_count": count,
    }


def make_mock_pool(rows: list):
    conn = AsyncMock()
    conn.fetch = AsyncMock(return_value=rows)
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=conn),
        __aexit__=AsyncMock(return_value=False),
    ))
    return pool, conn


@pytest.mark.asyncio
async def test_improving_trend():
    from backend.main import app
    rows = [
        make_week_row(0, 4.0, 3),
        make_week_row(1, 5.0, 4),
        make_week_row(2, 7.5, 5),
        make_week_row(3, 9.0, 6),
    ]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/games/Elden Ring/trends")
    assert res.status_code == 200
    data = res.json()
    assert data["trend"] == "improving"


@pytest.mark.asyncio
async def test_declining_trend():
    from backend.main import app
    rows = [
        make_week_row(0, 9.0, 6),
        make_week_row(1, 7.5, 5),
        make_week_row(2, 5.0, 4),
        make_week_row(3, 3.5, 3),
    ]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/games/Cyberpunk 2077/trends")
    data = res.json()
    assert data["trend"] == "declining"


@pytest.mark.asyncio
async def test_stable_trend():
    from backend.main import app
    rows = [
        make_week_row(0, 7.8, 5),
        make_week_row(1, 8.0, 5),
        make_week_row(2, 7.9, 5),
        make_week_row(3, 8.1, 5),
    ]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/games/Hades/trends")
    data = res.json()
    assert data["trend"] == "stable"


@pytest.mark.asyncio
async def test_no_reviews_returns_empty():
    from backend.main import app
    pool, _ = make_mock_pool([])
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/games/Unknown Game/trends")
    data = res.json()
    assert data["trend"] == "stable"
    assert data["periods"] == []
    assert data["overallAvg"] is None


@pytest.mark.asyncio
async def test_single_period_is_stable():
    from backend.main import app
    rows = [make_week_row(0, 8.0, 4)]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/games/Hades/trends")
    data = res.json()
    assert data["trend"] == "stable"
    assert len(data["periods"]) == 1


@pytest.mark.asyncio
async def test_response_shape():
    from backend.main import app
    rows = [make_week_row(0, 8.0, 5), make_week_row(1, 7.5, 3)]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/games/Hades/trends")
    data = res.json()
    assert "gameTitle" in data
    assert "trend" in data
    assert "periods" in data
    assert "overallAvg" in data
    assert data["periods"][0]["avgRating"] == 8.0
    assert data["periods"][0]["reviewCount"] == 5
