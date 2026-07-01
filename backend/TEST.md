# Testing — Python FastAPI Backend

## Stack

| Tool | Purpose |
|------|---------|
| pytest | Test runner |
| pytest-asyncio | Async test support for FastAPI routes |
| httpx | ASGI test client (FastAPI's recommended approach) |
| unittest.mock | Mocking the asyncpg DB pool and OpenAI client |

## Running Tests

```bash
# From the project root
python3 -m pytest backend/tests/ -v

# Run a single suite
python3 -m pytest backend/tests/test_classify_logic.py -v
```

## Test Files

```
backend/tests/
├── test_classify_logic.py   # pure classify_by_rules() function (17 tests)
├── test_reviews.py          # GET + POST /api/reviews (5 tests)
├── test_stats.py            # GET /api/stats (5 tests)
├── test_classify_route.py   # POST /api/classify (7 tests)
└── test_ask.py              # POST /api/ask RAG endpoint (5 tests)
```

**Total: 39 tests across 5 suites.**

## What Each Suite Covers

### `test_classify_logic.py`
Tests the pure `classify_by_rules(text)` function in `backend/classify.py`.
Mirrors the TypeScript tests in `src/__tests__/lib/classify.test.ts` so both
layers enforce the same contract.

- Spam signals: `discount`, `giveaway`, `free v-bucks`, `link in bio`, etc.
- Toxic signals: `trash`, `garbage`, `idiot`, `devs are idiots`, etc.
- Helpful: genuine reviews with no spam or toxic signals
- Case-insensitivity
- Empty string does not crash
- `'code'` and `'click'` alone do **not** trigger spam (false positive guard)
- Spam takes priority when both spam and toxic signals are present

### `test_reviews.py`
Mocks the `asyncpg` pool and calls the route handlers via `httpx.AsyncClient`.

- `GET /api/reviews` — returns all reviews
- `GET /api/reviews?filter=helpful` — SQL contains `'helpful'` filter
- `GET /api/reviews?game=Hades` — passes game name to LIKE query
- `POST /api/reviews` — creates review, returns 201 with `classification: pending`
- `POST /api/reviews` with missing fields — returns 422

### `test_stats.py`
- Correct counts for helpful, spam, and toxic
- `avgRating` calculated from helpful reviews only
- `avgRating` returns `"0"` when there are no helpful reviews
- `uniqueGames` counts distinct game titles from helpful reviews only
- **Single DB query** — regression guard against the double-query bug fixed in Phase 2

### `test_classify_route.py`
- Missing `reviewId` or `headline` → 422
- Rule-based path: spam text → `spam`, `method: rule-based`
- Rule-based path: toxic text → `toxic`, `method: rule-based`
- Rule-based path: clean text → `helpful`, `method: rule-based`
- AI path: mocked OpenAI returns JSON → persisted, `method: ai`
- OpenAI failure → falls back to rule-based, `method: rule-based-fallback`

### `test_ask.py`
Locks down the RAG contract before implementation.

- Missing `question` field → 422
- No `OPENAI_API_KEY` → 503
- No reviews with embeddings yet → 200 with friendly message, `sources: []`
- Reviews exist → 200 with `answer` string and `sources` array
- Embedding is generated for the question before the pgvector search

## Mocking Strategy

**DB pool** (`asyncpg`): Each test creates a `MagicMock` pool whose `acquire()`
context manager returns an `AsyncMock` connection. Tests assert on `conn.fetch`,
`conn.fetchrow`, and `conn.execute` call arguments.

**OpenAI client**: `patch("backend.main.AsyncOpenAI")` replaces the client.
`chat.completions.create` and `embeddings.create` are mocked with
`AsyncMock` to return controlled responses without hitting the real API.

**`OPENAI_API_KEY`**: Patched directly on the module (`patch("backend.main.OPENAI_API_KEY", None)`)
to test the rule-based fallback path without needing `monkeypatch.delenv`.

## Bugs Caught by TDD

### 1. Dotenv path resolution
**Problem:** `load_dotenv("../.env.local")` resolved relative to the working
directory, not the file — so running from the project root pointed at the
wrong path and `DATABASE_URL` was empty, causing FastAPI to try `localhost:5432`.

**Fix:** Replaced with `load_dotenv(Path(__file__).parent.parent / ".env.local")`.

### 2. `on_event` deprecation
**Problem:** FastAPI's `@app.on_event("startup")` is deprecated in modern FastAPI
and produced warnings in the test output.

**Fix:** Replaced with `@asynccontextmanager` lifespan function.

## Combined Test Coverage

| Layer | Runner | Tests |
|-------|--------|-------|
| Python backend | pytest | 39 |
| TypeScript frontend + API | Jest | 44 |
| **Total** | | **83** |
