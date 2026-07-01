# Testing — Gamers' Feedback

## Stack

| Tool | Purpose |
|------|---------|
| Jest 30 | Test runner |
| `next/jest` | SWC-based TypeScript transform (no Babel needed) |
| `jest.fn()` | Mocking Prisma and store functions |

## Running Tests

```bash
npm test            # run all tests once
npm run test:watch  # re-run on file change
```

## Test Files

```
src/__tests__/
├── lib/
│   ├── classify.test.ts      # pure classification logic (17 tests)
│   └── reviewStore.test.ts   # Prisma-backed store with mocked DB (14 tests)
└── api/
    ├── reviews.test.ts       # GET + POST /api/reviews (6 tests)
    └── classify.test.ts      # POST /api/classify (7 tests)
```

**Total: 44 tests across 4 suites.**

## What Each Suite Covers

### `lib/classify.test.ts`
Tests the pure `classifyByRules(text)` function in `src/lib/classify.ts`.

- Spam signals: `discount`, `giveaway`, `free v-bucks`, `link in bio`, etc.
- Toxic signals: `trash`, `garbage`, `idiot`, `devs are idiots`, etc.
- Helpful: genuine reviews with no spam or toxic signals
- Case-insensitivity
- Empty string does not crash
- Spam takes priority when both spam and toxic signals are present
- `'code'` and `'click'` alone do **not** trigger spam (false positive fix)

### `lib/reviewStore.test.ts`
Mocks `@/lib/prisma` and tests each store function in isolation.

- `getAllReviews` — ordered by `createdAt desc`, maps `null` reason to `undefined`
- `getHelpfulReviews` — passes correct `where` clause
- `getReviewsByGame` — case-insensitive contains, helpful-only filter
- `addReview` — always stores `classification: 'pending'`; callers cannot override it
- `updateReviewClassification` — writes correct fields; omits reason when not provided
- `getStats` — correct counts, avgRating from helpful reviews only, uniqueGames deduped, **single DB query** (regression guard for the double-query bug)

### `api/reviews.test.ts`
Mocks `@/lib/reviewStore` and calls the route handlers directly with `NextRequest`.

- `GET` with no params → `getAllReviews`
- `GET ?filter=helpful` → `getHelpfulReviews`
- `GET ?game=Hades` → `getReviewsByGame('Hades')`
- `game` param takes priority over `filter` param
- `POST` with valid body → 201 + review in response
- `POST` when store throws → 500 + `{ error: 'Failed to create review' }`

### `api/classify.test.ts`
Mocks `updateReviewClassification` and tests the classify route handler.

- Missing `reviewId` → 400
- Missing `headline` → 400
- Missing `body` → 400
- Spam text → `classification: 'spam'`, persisted, `method: 'rule-based'`
- Toxic text → `classification: 'toxic'`, persisted
- Clean text → `classification: 'helpful'`, persisted
- Missing optional `pros`/`cons` fields do not crash

## Bugs Found and Fixed by TDD

### 1. Spam false positives (`classify.ts`)
**Problem:** The original keyword list included `'code'` and `'click'` as spam signals.
- `"The game code is buggy"` → incorrectly classified as **spam**
- `"Click to attack enemies"` → incorrectly classified as **spam**

**Fix:** Replaced `'code'` with `'promo code'` / `'coupon code'` and `'click'` with `'click here'`.

### 2. Double DB query in `getStats` (`reviewStore.ts`)
**Problem:** `getStats` fetched all reviews via `getAllReviews()`, then called `getUniqueGameTitles()` which internally called `getHelpfulReviews()` — a second DB round-trip to compute data already in memory.

**Fix:** Replaced `(await getUniqueGameTitles()).length` with `new Set(helpful.map(r => r.gameTitle)).size`, reusing the already-fetched `helpful` array.

## Mocking Strategy

**Prisma** (`reviewStore` tests): `jest.mock('@/lib/prisma', ...)` replaces the client with plain `jest.fn()` instances. Tests assert the exact arguments passed to `findMany`, `create`, and `update`.

**Store functions** (API route tests): `jest.mock('@/lib/reviewStore', ...)` decouples route handler logic from DB access entirely.

**`jest.resetAllMocks()`** is used in `beforeEach` (not `clearAllMocks`) to flush `mockResolvedValueOnce` queues between tests, preventing mock values from leaking across test cases.
