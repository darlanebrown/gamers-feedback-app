"""
Tests for GET /api/stats.
Verifies counts, avgRating (helpful only), uniqueGames, and single DB query.
"""
from unittest.mock import AsyncMock, patch, MagicMock, call
from httpx import AsyncClient, ASGITransport
import datetime
import pytest


def make_row(overrides=None):
    base = {
        "id": "r1",
        "gameTitle": "Elden Ring",
        "platform": "PC",
        "rating": 9,
        "headline": "Masterpiece",
        "body": "Great game.",
        "pros": "Combat",
        "cons": "Hard",
        "playtime": "100 hours",
        "reviewerTag": "Gamer#1",
        "classification": "helpful",
        "classificationReason": None,
        "createdAt": datetime.datetime(2024, 1, 1),
        "embedding": None,
    }
    return {**base, **(overrides or {})}


def make_mock_pool(rows):
    conn = AsyncMock()
    conn.fetch = AsyncMock(return_value=rows)
    conn.execute = AsyncMock()
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=conn),
        __aexit__=AsyncMock(return_value=False),
    ))
    return pool, conn


@pytest.mark.asyncio
async def test_stats_counts():
    from backend.main import app
    rows = [
        make_row({"classification": "helpful", "rating": 9}),
        make_row({"id": "r2", "classification": "helpful", "rating": 8}),
        make_row({"id": "r3", "classification": "spam", "rating": 3}),
        make_row({"id": "r4", "classification": "toxic", "rating": 1}),
    ]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/stats")
    data = res.json()
    assert data["total"] == 4
    assert data["helpful"] == 2
    assert data["spam"] == 1
    assert data["toxic"] == 1


@pytest.mark.asyncio
async def test_avg_rating_uses_helpful_only():
    from backend.main import app
    rows = [
        make_row({"classification": "helpful", "rating": 9}),
        make_row({"id": "r2", "classification": "helpful", "rating": 7}),
        make_row({"id": "r3", "classification": "spam", "rating": 1}),
    ]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/stats")
    assert res.json()["avgRating"] == "8.0"


@pytest.mark.asyncio
async def test_avg_rating_zero_when_no_helpful():
    from backend.main import app
    rows = [make_row({"classification": "spam", "rating": 1})]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/stats")
    assert res.json()["avgRating"] == "0"


@pytest.mark.asyncio
async def test_unique_games_counts_helpful_only():
    from backend.main import app
    rows = [
        make_row({"gameTitle": "Elden Ring"}),
        make_row({"id": "r2", "gameTitle": "Elden Ring"}),
        make_row({"id": "r3", "gameTitle": "Hades"}),
        make_row({"id": "r4", "classification": "spam", "gameTitle": "Spam Game"}),
    ]
    pool, _ = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/stats")
    assert res.json()["uniqueGames"] == 2


@pytest.mark.asyncio
async def test_stats_makes_single_db_query():
    from backend.main import app
    rows = [make_row()]
    pool, conn = make_mock_pool(rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.get("/api/stats")
    assert conn.fetch.call_count == 1
