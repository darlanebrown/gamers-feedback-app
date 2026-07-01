# Testing — Python FastAPI Backend

## Stack

| Tool | Purpose |
|------|---------|
| pytest | Test runner |
| pytest-asyncio | Async test support for FastAPI route handlers |
| httpx | ASGI test client (FastAPI's recommended approach) |
| `unittest.mock` | Mocking the asyncpg DB pool and OpenAI client |

## Running Tests

```bash
# From the project root
python3 -m pytest backend/tests/ -v

# Run a single suite
python3 -m pytest backend/tests/test_analytics.py -v

# Quiet summary only
python3 -m pytest backend/tests/ -q
```

## Test Summary

| Suite | File | Tests |
|-------|------|-------|
| Classification logic | `test_classify_logic.py` | 17 |
| Reviews API | `test_reviews.py` | 5 |
| Stats API | `test_stats.py` | 5 |
| Classify route | `test_classify_route.py` | 7 |
| Ask / RAG | `test_ask.py` | 5 |
| Bomb detection | `test_bomb_detection.py` | 5 |
| Sentiment trends | `test_sentiment_trends.py` | 6 |
| Recommendations | `test_recommendations.py` | 5 |
| Analytics | `test_analytics.py` | 7 |
| Profile | `test_profile.py` | 6 |
| Validation | `test_validation.py` | 11 |
| **Total** | **11 suites** | **79** |

## Test File Structure

```
backend/tests/
├── test_classify_logic.py    — pure classify_by_rules() function (17 tests)
├── test_reviews.py           — GET + POST /api/reviews (5 tests)
├── test_stats.py             — GET /api/stats (5 tests)
├── test_classify_route.py    — POST /api/classify (7 tests)
├── test_ask.py               — POST /api/ask RAG endpoint (5 tests)
├── test_bomb_detection.py    — GET /api/games/{title}/bomb-check (5 tests)
├── test_sentiment_trends.py  — GET /api/games/{title}/trends (6 tests)
├── test_recommendations.py   — GET /api/recommendations (5 tests)
├── test_analytics.py         — GET /api/analytics/{title} (7 tests)
├── test_profile.py           — GET /api/profile/{tag} (6 tests)
└── test_validation.py        — Pydantic model validation (11 tests)
```

---

## What Each Suite Covers

### `test_classify_logic.py` — 17 tests
Tests the pure `classify_by_rules(text)` function in `backend/classify.py`.
No DB, no HTTP — pure unit tests. Mirrors `src/__tests__/lib/classify.test.ts`
so both layers enforce the same contract.

**Spam detection**
- `TestSpam::test_detects_discount`
- `TestSpam::test_detects_giveaway`
- `TestSpam::test_detects_free_vbucks`
- `TestSpam::test_detects_link_in_bio`
- `TestSpam::test_case_insensitive`
- `TestSpam::test_word_code_alone_is_not_spam`
- `TestSpam::test_click_alone_is_not_spam`
- `TestSpam::test_returns_reason_string`

**Toxic detection**
- `TestToxic::test_detects_devs_are_idiots`
- `TestToxic::test_detects_worst_game_ever`
- `TestToxic::test_detects_trash`
- `TestToxic::test_case_insensitive`

**Helpful classification**
- `TestHelpful::test_genuine_positive_review`
- `TestHelpful::test_genuine_critical_review`
- `TestHelpful::test_empty_string_does_not_crash`
- `TestHelpful::test_cheat_codes_not_spam`

**Priority rule**
- `TestPriority::test_spam_beats_toxic_when_both_present`

---

### `test_reviews.py` — 5 tests
Mocks the `asyncpg` pool and calls routes via `httpx.AsyncClient`.

- `GET /api/reviews` → returns all reviews
- `GET /api/reviews?filter=helpful` → SQL contains `'helpful'` filter
- `GET /api/reviews?game=Hades` → passes game name to LIKE query
- `POST /api/reviews` → creates review, returns 201 with `classification: pending`
- `POST /api/reviews` with missing fields → 422

---

### `test_stats.py` — 5 tests
- Correct counts for helpful, spam, and toxic
- `avgRating` calculated from helpful reviews only
- `avgRating` returns `"0"` when there are no helpful reviews
- `uniqueGames` counts distinct game titles from helpful reviews only
- **Single DB query** — regression guard against the double-query bug fixed in Phase 2

---

### `test_classify_route.py` — 7 tests
- Missing `reviewId` → 400
- Missing `headline` → 422
- Rule-based: spam text → `spam`, `method: rule-based`
- Rule-based: toxic text → `toxic`, `method: rule-based`
- Rule-based: clean text → `helpful`, `method: rule-based`
- AI path: mocked OpenAI returns JSON → persisted, `method: ai`
- OpenAI failure → falls back to rule-based, `method: rule-based-fallback`

---

### `test_ask.py` — 5 tests
Tests the RAG endpoint `POST /api/ask`. Mocks OpenAI embeddings + chat completions.

- Missing `question` field → 422
- No `OPENAI_API_KEY` → 503
- No reviews with embeddings → 200 with friendly message, `sources: []`
- Reviews exist → 200 with `answer` string and `sources` array
- Embedding is generated for the question before the pgvector search

---

### `test_bomb_detection.py` — 5 tests
Tests `GET /api/games/{title}/bomb-check`. Added in Phase 4.

- No bombing when negative review count is below threshold
- Bombing detected when count exactly equals threshold
- Bombing detected well above threshold
- Response includes metadata (`threshold`, `windowHours`, `negativeCount`)
- Query uses the correct time window

---

### `test_sentiment_trends.py` — 6 tests
Tests `GET /api/games/{title}/trends`. Added in Phase 4.

- `test_improving_trend` — second-half avg > first-half avg by > 0.5
- `test_declining_trend` — second-half avg < first-half avg by > 0.5
- `test_stable_trend` — difference ≤ 0.5
- `test_no_reviews_returns_empty` — no reviews → stable with empty data
- `test_single_period_is_stable` — too few reviews to compare → stable
- `test_response_shape` — response includes `trend`, `periods`, `avgRatings`

---

### `test_recommendations.py` — 5 tests
Tests `GET /api/recommendations?reviewerTag=...`. Added in Phase 4.

- Returns games the reviewer has **not** reviewed, sorted by community avg rating
- New reviewer (no history) → returns popular games
- Missing `reviewerTag` → 400
- Response shape includes `gameTitle`, `avgRating`, `reviewCount`
- No available games → returns empty list

---

### `test_analytics.py` — 7 tests
Tests `GET /api/analytics/{title}`. Added in Phase 4.

- `test_analytics_response_shape` — all required keys present
- `test_counts_are_accurate` — helpful/spam/toxic counts match fixture
- `test_sentiment_score_is_avg_helpful_rating` — float averaged correctly
- `test_no_helpful_reviews_sentiment_is_none` — `sentimentScore: null` when no helpful
- `test_top_pros_and_cons_are_lists` — `topPros` and `topCons` are string arrays
- `test_bomb_alert_flag_included` — `bombAlert` boolean present
- `test_no_reviews_returns_zeros` — graceful zero-state for unknown games

---

### `test_profile.py` — 6 tests
Tests `GET /api/profile/{tag}`. Added in Phase 5.

- `test_profile_response_shape` — `gamerTag`, `reviews`, `reputation`, `stats` all present
- `test_gold_badge_all_helpful` — 100% helpful → Gold badge
- `test_silver_badge` — 50–79% helpful → Silver badge
- `test_bronze_badge` — < 50% helpful → Bronze badge
- `test_no_reviews_returns_zeros` — `score: 0`, `badge: null`, empty reviews
- `test_avg_rating_uses_helpful_only` — `avgRating` excludes spam/toxic reviews

---

### `test_validation.py` — 11 tests
Tests Pydantic model validation for the `ReviewIn` schema. Added in Phase 3.

- `test_valid_review_passes` — well-formed payload accepted
- `test_rating_below_1_rejected` — rating < 1 → validation error
- `test_rating_above_10_rejected` — rating > 10 → validation error
- `test_headline_too_short_rejected` — headline < 5 chars → error
- `test_headline_too_long_rejected` — headline > 120 chars → error
- `test_body_too_short_rejected` — body < 20 chars → error
- `test_game_title_too_short_rejected` — game title < 2 chars → error
- `test_invalid_platform_rejected` — platform not in allowed list → error
- `test_all_valid_platforms_accepted` — all 8 platforms pass validation
- `test_reviewer_tag_too_short_rejected` — tag < 2 chars → error
- `test_rating_must_be_integer` — float rating → error

---

## Mocking Strategy

**DB pool** (`asyncpg`): Each test creates a `MagicMock` pool whose `acquire()`
context manager returns an `AsyncMock` connection. Tests assert on `conn.fetch`,
`conn.fetchrow`, and `conn.execute` call arguments.

**OpenAI client**: `patch("backend.main.AsyncOpenAI")` replaces the client.
`chat.completions.create` and `embeddings.create` are mocked with `AsyncMock`
to return controlled responses without hitting the real API.

**`OPENAI_API_KEY`**: Patched directly on the module
(`patch("backend.main.OPENAI_API_KEY", None)`) to test the rule-based fallback
path without needing `monkeypatch.delenv`.

---

## Bugs Found and Fixed by TDD

### 1. Dotenv path resolution
`load_dotenv("../.env.local")` resolved relative to the working directory, not
the file — so running from the project root pointed at the wrong path and
`DATABASE_URL` was empty. Fix: `load_dotenv(Path(__file__).parent.parent / ".env.local")`.

### 2. `on_event` deprecation
FastAPI's `@app.on_event("startup")` is deprecated and produced warnings in test
output. Fix: replaced with `@asynccontextmanager` lifespan function.

### 3. Spam false positives
`"The game code is buggy"` and `"Click to attack"` triggered spam. Fix: replaced
`'code'` → `'promo code'` and `'click'` → `'click here'` in the keyword list.

---

## Combined Test Coverage

| Layer | Runner | Suites | Tests |
|-------|--------|--------|-------|
| TypeScript (Next.js API + lib) | Jest 30 | 19 | 148 |
| Python (FastAPI backend) | pytest | 11 | 79 |
| **Total** | | **30** | **227** |
