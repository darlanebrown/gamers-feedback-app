"""
Server-side validation tests for POST /api/reviews.
All written before the validation is implemented (RED phase).
"""
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
import pytest


VALID_BODY = {
    "gameTitle": "Elden Ring",
    "platform": "PC",
    "rating": 9,
    "headline": "A stunning masterpiece",
    "body": "Elden Ring redefines the open world genre with tight combat and incredible boss design.",
    "pros": "Combat, world design",
    "cons": "Very difficult",
    "playtime": "100 hours",
    "reviewerTag": "Gamer#1",
}


def make_mock_pool():
    import datetime
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(return_value={
        "id": "r1", "gameTitle": "Elden Ring", "platform": "PC",
        "rating": 9, "headline": "A stunning masterpiece",
        "body": "Elden Ring redefines the open world genre.",
        "pros": "Combat", "cons": "Hard", "playtime": "100 hours",
        "reviewerTag": "Gamer#1", "classification": "pending",
        "classificationReason": None,
        "createdAt": datetime.datetime(2024, 1, 1), "embedding": None,
    })
    conn.execute = AsyncMock()
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=conn),
        __aexit__=AsyncMock(return_value=False),
    ))
    return pool


@pytest.mark.asyncio
async def test_valid_review_passes():
    from backend.main import app
    pool = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/reviews", json=VALID_BODY)
    assert res.status_code == 201


@pytest.mark.asyncio
async def test_rating_below_1_rejected():
    from backend.main import app
    pool = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/reviews", json={**VALID_BODY, "rating": 0})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_rating_above_10_rejected():
    from backend.main import app
    pool = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/reviews", json={**VALID_BODY, "rating": 11})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_headline_too_short_rejected():
    from backend.main import app
    pool = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/reviews", json={**VALID_BODY, "headline": "Ok"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_headline_too_long_rejected():
    from backend.main import app
    pool = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/reviews", json={**VALID_BODY, "headline": "x" * 121})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_body_too_short_rejected():
    from backend.main import app
    pool = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/reviews", json={**VALID_BODY, "body": "Too short."})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_game_title_too_short_rejected():
    from backend.main import app
    pool = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/reviews", json={**VALID_BODY, "gameTitle": "X"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_invalid_platform_rejected():
    from backend.main import app
    pool = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/reviews", json={**VALID_BODY, "platform": "Atari 2600"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_all_valid_platforms_accepted():
    from backend.main import app
    valid_platforms = [
        "PC", "PlayStation 5", "PlayStation 4",
        "Xbox Series X/S", "Xbox One", "Nintendo Switch",
        "Steam Deck", "Mobile",
    ]
    pool = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            for platform in valid_platforms:
                res = await client.post("/api/reviews", json={**VALID_BODY, "platform": platform})
                assert res.status_code == 201, f"Platform '{platform}' was incorrectly rejected"


@pytest.mark.asyncio
async def test_reviewer_tag_too_short_rejected():
    from backend.main import app
    pool = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/reviews", json={**VALID_BODY, "reviewerTag": "x"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_rating_must_be_integer():
    from backend.main import app
    pool = make_mock_pool()
    with patch("backend.main.pool", pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/reviews", json={**VALID_BODY, "rating": "great"})
    assert res.status_code == 422
