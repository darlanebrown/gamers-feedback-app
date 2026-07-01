"""
Tests for GET /api/recommendations?reviewerTag=X
Returns top-rated games the reviewer hasn't tried yet.
Falls back to popularity when the reviewer has no history.
"""
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
import pytest


def make_rec_row(game_title: str, avg_rating: float, review_count: int):
    return {
        "gameTitle": game_title,
        "avg_rating": avg_rating,
        "review_count": review_count,
    }


def make_mock_pool_two_queries(reviewer_games: list[str], rec_rows: list):
    """
    First fetch returns reviewer's game titles.
    Second fetch returns recommendation candidates.
    """
    conn = AsyncMock()
    conn.fetch = AsyncMock(side_effect=[
        [{"gameTitle": g} for g in reviewer_games],
        rec_rows,
    ])
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=conn),
        __aexit__=AsyncMock(return_value=False),
    ))
    return pool, conn


@pytest.mark.asyncio
async def test_returns_games_not_reviewed():
    from backend.main import app
    rec_rows = [
        make_rec_row("Hades", 9.2, 8),
        make_rec_row("Celeste", 8.8, 6),
    ]
    pool, _ = make_mock_pool_two_queries(["Elden Ring", "Fortnite"], rec_rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/recommendations", params={"reviewerTag": "Gamer#1"})
    assert res.status_code == 200
    data = res.json()
    titles = [r["gameTitle"] for r in data["recommendations"]]
    assert "Hades" in titles
    assert "Celeste" in titles
    assert "Elden Ring" not in titles
    assert "Fortnite" not in titles


@pytest.mark.asyncio
async def test_new_reviewer_gets_popular_games():
    from backend.main import app
    rec_rows = [
        make_rec_row("Hades", 9.5, 10),
        make_rec_row("Celeste", 9.0, 7),
    ]
    pool, _ = make_mock_pool_two_queries([], rec_rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/recommendations", params={"reviewerTag": "NewPlayer#1"})
    data = res.json()
    assert len(data["recommendations"]) > 0
    assert data["recommendations"][0]["avgRating"] >= data["recommendations"][-1]["avgRating"]


@pytest.mark.asyncio
async def test_missing_reviewer_tag_returns_400():
    from backend.main import app
    pool = MagicMock()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/recommendations")
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_response_shape():
    from backend.main import app
    rec_rows = [make_rec_row("Hades", 9.2, 8)]
    pool, _ = make_mock_pool_two_queries([], rec_rows)
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/recommendations", params={"reviewerTag": "Gamer#1"})
    data = res.json()
    assert "reviewerTag" in data
    assert "recommendations" in data
    rec = data["recommendations"][0]
    assert "gameTitle" in rec
    assert "avgRating" in rec
    assert "reviewCount" in rec


@pytest.mark.asyncio
async def test_no_available_games_returns_empty_list():
    from backend.main import app
    pool, _ = make_mock_pool_two_queries([], [])
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/recommendations", params={"reviewerTag": "Gamer#1"})
    data = res.json()
    assert data["recommendations"] == []
