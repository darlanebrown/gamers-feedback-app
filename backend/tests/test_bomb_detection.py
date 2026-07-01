"""
Tests for GET /api/games/{title}/bomb-check
A "bomb" is BOMB_THRESHOLD+ negative reviews (rating ≤ 4 OR toxic)
for the same game within BOMB_WINDOW_HOURS hours.
"""
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
import pytest


def make_mock_pool(count: int):
    conn = AsyncMock()
    conn.fetchval = AsyncMock(return_value=count)
    conn.execute = AsyncMock()
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=conn),
        __aexit__=AsyncMock(return_value=False),
    ))
    return pool, conn


@pytest.mark.asyncio
async def test_no_bombing_when_below_threshold():
    from backend.main import app, BOMB_THRESHOLD
    pool, _ = make_mock_pool(count=BOMB_THRESHOLD - 1)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/games/Elden Ring/bomb-check")
    assert res.status_code == 200
    data = res.json()
    assert data["isBombing"] is False
    assert data["gameTitle"] == "Elden Ring"


@pytest.mark.asyncio
async def test_bombing_detected_at_threshold():
    from backend.main import app, BOMB_THRESHOLD
    pool, _ = make_mock_pool(count=BOMB_THRESHOLD)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/games/Elden Ring/bomb-check")
    data = res.json()
    assert data["isBombing"] is True


@pytest.mark.asyncio
async def test_bombing_well_above_threshold():
    from backend.main import app, BOMB_THRESHOLD
    pool, _ = make_mock_pool(count=BOMB_THRESHOLD * 3)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/games/Fortnite/bomb-check")
    data = res.json()
    assert data["isBombing"] is True
    assert data["negativeReviewsInWindow"] == BOMB_THRESHOLD * 3


@pytest.mark.asyncio
async def test_response_includes_metadata():
    from backend.main import app, BOMB_THRESHOLD, BOMB_WINDOW_HOURS
    pool, _ = make_mock_pool(count=0)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/games/Hades/bomb-check")
    data = res.json()
    assert "gameTitle" in data
    assert "isBombing" in data
    assert "negativeReviewsInWindow" in data
    assert data["threshold"] == BOMB_THRESHOLD
    assert data["windowHours"] == BOMB_WINDOW_HOURS


@pytest.mark.asyncio
async def test_bomb_check_queries_correct_window():
    from backend.main import app
    pool, conn = make_mock_pool(count=0)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.get("/api/games/Cyberpunk 2077/bomb-check")
    query = conn.fetchval.call_args[0][0]
    assert "INTERVAL" in query
    assert "rating" in query.lower() or "classification" in query.lower()
