# Testing — Gamers' Feedback (TypeScript / Next.js)

## Stack

| Tool | Purpose |
|------|---------|
| Jest 30 | Test runner |
| `next/jest` (SWC) | TypeScript transform — no Babel needed |
| `jest.fn()` | Mocking Prisma client and store functions |
| `NextRequest` | Calling route handlers directly without an HTTP server |
| `jose` | JWT library (ESM-only — requires async `jest.config.js` override) |

## Running Tests

```bash
npm test               # run all tests once
npm run test:watch     # re-run on file change
npx jest --no-coverage # skip coverage report (faster)
```

## Test Summary

| Suite | File | Tests |
|-------|------|-------|
| `lib/classify` | `lib/classify.test.ts` | 17 |
| `lib/reviewStore` | `lib/reviewStore.test.ts` | 14 |
| `lib/auth` | `lib/auth.test.ts` | 5 |
| `lib/adminMiddleware` | `lib/adminMiddleware.test.ts` | 4 |
| `lib/gameService` | `lib/gameService.test.ts` | 6 |
| `lib/voteStore` | `lib/voteStore.test.ts` | 5 |
| `lib/followStore` | `lib/followStore.test.ts` | 8 |
| `api/reviews` | `api/reviews.test.ts` | 13 |
| `api/classify` | `api/classify.test.ts` | 7 |
| `api/auth` | `api/auth.test.ts` | 11 |
| `api/profile-route` | `api/profile-route.test.ts` | 7 |
| `api/admin-reviews` | `api/admin-reviews.test.ts` | 8 |
| `api/admin-users` | `api/admin-users.test.ts` | 10 |
| `api/admin-alerts` | `api/admin-alerts.test.ts` | 5 |
| `api/game-route` | `api/game-route.test.ts` | 3 |
| `api/vote-route` | `api/vote-route.test.ts` | 6 |
| `api/follow-route` | `api/follow-route.test.ts` | 6 |
| `api/feed-route` | `api/feed-route.test.ts` | 4 |
| `api/search-route` | `api/search-route.test.ts` | 9 |
| **Total** | **19 suites** | **148** |

## Test File Structure

```
src/__tests__/
├── lib/
│   ├── classify.test.ts        — pure classification logic (17 tests)
│   ├── reviewStore.test.ts     — Prisma-backed store with mocked DB (14 tests)
│   ├── auth.test.ts            — JWT sign/verify round-trips (5 tests)
│   ├── adminMiddleware.test.ts — requireAdmin() guard (4 tests)
│   ├── gameService.test.ts     — RAWG fetch + 7-day cache logic (6 tests)
│   ├── voteStore.test.ts       — upvote/downvote upsert & counts (5 tests)
│   └── followStore.test.ts     — follow/unfollow/isFollowing (8 tests)
└── api/
    ├── reviews.test.ts         — GET + POST /api/reviews (13 tests)
    ├── classify.test.ts        — POST /api/classify (7 tests)
    ├── auth.test.ts            — register/login/logout/me routes (11 tests)
    ├── profile-route.test.ts   — GET /api/profile/[tag] (7 tests)
    ├── admin-reviews.test.ts   — GET + PATCH /api/admin/reviews (8 tests)
    ├── admin-users.test.ts     — GET + PATCH /api/admin/users (10 tests)
    ├── admin-alerts.test.ts    — GET /api/admin/alerts (5 tests)
    ├── game-route.test.ts      — GET /api/games/[title] (3 tests)
    ├── vote-route.test.ts      — POST + DELETE /api/reviews/[id]/vote (6 tests)
    ├── follow-route.test.ts    — POST + DELETE /api/profile/[tag]/follow (6 tests)
    ├── feed-route.test.ts      — GET /api/feed (4 tests)
    └── search-route.test.ts    — GET /api/search (9 tests)
```

---

## What Each Suite Covers

### `lib/classify.test.ts` — 17 tests
Tests the pure `classifyByRules(text)` function in `src/lib/classify.ts`. No DB, no HTTP.

**Spam detection**
- Detects `discount`, `giveaway`, `free v-bucks`, `link in bio`
- Case-insensitive matching
- `"code"` alone does **not** trigger spam (`"promo code"` does)
- Returns a human-readable reason string

**Toxic detection**
- Detects `"devs are idiots"`, `"worst game ever"`, `"trash"`
- Case-insensitive

**Helpful classification**
- Genuine positive and critical reviews both classify as helpful
- Empty string does not crash
- `"cheat codes"` and `"click to attack"` are not spam

**Priority rule**
- Spam beats toxic when both signals are present

---

### `lib/reviewStore.test.ts` — 14 tests
Mocks `@/lib/prisma` and tests each store function in isolation.

- `getAllReviews` — ordered `createdAt desc`, maps `null` reason to `undefined`
- `getHelpfulReviews` — passes correct `where` clause
- `getReviewsByGame` — case-insensitive contains, helpful-only
- `addReview` — always stores `classification: 'pending'`; callers cannot override
- `updateReviewClassification` — writes correct fields; omits reason when not provided
- `getStats` — correct counts, `avgRating` from helpful only, uniqueGames deduped, **single DB query** (regression guard)

---

### `lib/auth.test.ts` — 5 tests
Tests JWT utilities in `src/lib/auth.ts` using the real `jose` library (no mock).

- Round-trips a valid `SessionPayload` through `signToken` → `verifyToken`
- Returns `null` for a tampered token
- Returns `null` for an empty string
- Returns `null` for a random string
- Produced token is a three-part JWT (`header.payload.signature`)

---

### `lib/adminMiddleware.test.ts` — 4 tests
Tests `requireAdmin()` in `src/lib/adminMiddleware.ts`.

- Returns 401 when there is no session
- Returns 403 when session user has `role: 'user'`
- Returns `null` (passes) when session user has `role: 'admin'`
- Returns 403 when session has no role field

---

### `lib/gameService.test.ts` — 6 tests
Tests the RAWG API integration and 7-day cache logic in `src/lib/gameService.ts`.
Mocks both `@/lib/prisma` and `global.fetch`.

- Returns cached game when `fetchedAt` is within 7 days
- Fetches from RAWG (two HTTP calls: search + detail) and upserts when not cached
- Re-fetches when cached entry is stale (> 7 days old)
- Returns `null` when `RAWG_API_KEY` is missing and no cache exists
- Returns `null` when RAWG returns no search results
- Returns stale cache entry when the RAWG fetch fails (graceful degradation)

---

### `lib/voteStore.test.ts` — 5 tests
Tests vote CRUD in `src/lib/voteStore.ts`. Mocks `prisma.reviewVote`.

- `upsertVote` — calls upsert with correct `where` / `create` / `update` args
- `upsertVote` — accepts `'down'` type
- `removeVote` — deletes by composite key `reviewId_voterTag`
- `getVoteCounts` — returns `{ up, down }` counts correctly
- `getVoteCounts` — returns `{ up: 0, down: 0 }` when no votes exist

---

### `lib/followStore.test.ts` — 8 tests
Tests follow/unfollow logic in `src/lib/followStore.ts`. Mocks `prisma.follow`.

- `followUser` — creates record with correct `{ followerTag, followingTag }`
- `unfollowUser` — deletes by composite key `followerTag_followingTag`
- `isFollowing` — returns `true` when record exists, `false` when it doesn't
- `getFollowedTags` — returns array of tag strings; empty array when following no one
- `getFollowerCount` — returns count of followers
- `getFollowingCount` — returns count of accounts being followed

---

### `api/reviews.test.ts` — 13 tests
Mocks `@/lib/reviewStore` and tests `GET` + `POST /api/reviews`.

**GET**
- No params → calls `getAllReviews`
- `?filter=helpful` → calls `getHelpfulReviews`
- `?game=Hades` → calls `getReviewsByGame('Hades')`
- Game param takes priority over filter param

**POST validation** (rejects invalid input before hitting the store)
- Rating below 1 → 400
- Rating above 10 → 400
- Headline < 5 chars → 400
- Headline > 120 chars → 400
- Body < 20 chars → 400
- Invalid platform → 400
- Game title < 2 chars → 400

**POST happy path**
- Valid body → 201 + review in response
- Store throws → 500 + `{ error: 'Failed to create review' }`

---

### `api/classify.test.ts` — 7 tests
Mocks `updateReviewClassification` and tests `POST /api/classify`.

- Missing `reviewId` → 400
- Missing `headline` → 400
- Missing `body` → 400
- Spam text → `classification: 'spam'`, persisted, `method: 'rule-based'`
- Toxic text → `classification: 'toxic'`, persisted
- Clean text → `classification: 'helpful'`, persisted
- Missing optional `pros`/`cons` fields do not crash

---

### `api/auth.test.ts` — 11 tests
Mocks `@/lib/userStore`, `bcryptjs`, and `@/lib/auth`. Tests all four auth routes.

**POST /api/auth/register**
- Valid body → 201, no `passwordHash` in response
- Email already taken → 409
- Gamer tag already taken → 409
- Password too short (< 8 chars) → 400
- Missing fields → 400

**POST /api/auth/login**
- Correct credentials → 200 + user object
- Wrong password → 401
- Email not found → 401

**POST /api/auth/logout**
- Returns 200 and calls `clearSessionCookie`

**GET /api/auth/me**
- Valid session → 200 + user
- No session → 401

---

### `api/profile-route.test.ts` — 7 tests
Mocks `@/lib/reviewStore`, `@/lib/followStore`, and `@/lib/auth`.
Tests `GET /api/profile/[tag]`.

- Returns 200 with `reviews`, `reputation`, `stats`, and `social`
- Computes `score` as percentage of helpful reviews
- Awards `Gold` badge for ≥ 80% helpful
- Awards `Silver` badge for 50–79% helpful
- Awards `Bronze` badge for < 50% helpful
- Returns `score: 0`, `badge: null` for a reviewer with no reviews
- `stats.avgRating` calculated from helpful reviews only

---

### `api/admin-reviews.test.ts` — 8 tests
Mocks `@/lib/adminMiddleware`, `@/lib/reviewStore`. Tests admin review routes.

**GET /api/admin/reviews**
- 401 when not authenticated
- 403 when not admin
- Returns all reviews for admin
- `?filter=spam` returns only spam reviews

**PATCH /api/admin/reviews/[id]**
- 401 when not authenticated
- 404 when review not found
- Overrides classification and returns updated review
- 400 for invalid classification value

---

### `api/admin-users.test.ts` — 10 tests
Mocks `@/lib/adminMiddleware`, `@/lib/userStore`. Tests admin user routes.

**GET /api/admin/users**
- 401 when not authenticated
- 403 when not admin
- Returns all users
- Never exposes `passwordHash`

**PATCH /api/admin/users/[id]**
- 401 when not authenticated
- 404 when user not found
- `action: 'ban'` → sets `banned: true`
- `action: 'unban'` → sets `banned: false`
- `action: 'promote'` → sets `role: 'admin'`
- Unknown action → 400

---

### `api/admin-alerts.test.ts` — 5 tests
Mocks `@/lib/adminMiddleware` and `@/lib/reviewStore`. Tests `GET /api/admin/alerts`.

- 401 when not authenticated
- 403 when not admin
- Filters games that meet the bomb threshold
- Returns empty list when no games are being bombed
- Response shape includes `negativeCount` and `isBombing` fields

---

### `api/game-route.test.ts` — 3 tests
Mocks `@/lib/gameService`. Tests `GET /api/games/[title]`.

- Returns 200 with `{ game: { title, metacritic, developer, ... } }` when found
- Returns 404 when `getOrFetchGame` returns null
- Passes the decoded title string to `getOrFetchGame`

---

### `api/vote-route.test.ts` — 6 tests
Mocks `@/lib/auth`, `@/lib/voteStore`, `@/lib/reviewStore`.
Tests `POST` + `DELETE /api/reviews/[id]/vote`.

**POST** (cast or change vote)
- 401 when not authenticated
- 404 when review does not exist
- 400 for invalid vote type (not `'up'` or `'down'`)
- Upserts vote and returns updated `{ up, down }` counts

**DELETE** (retract vote)
- 401 when not authenticated
- Removes vote and returns updated counts

---

### `api/follow-route.test.ts` — 6 tests
Mocks `@/lib/auth`, `@/lib/followStore`, `@/lib/userStore`.
Tests `POST` + `DELETE /api/profile/[tag]/follow`.

**POST** (follow)
- 401 when not authenticated
- 404 when target user does not exist
- 400 when trying to follow yourself
- Returns `{ following: true }` on success

**DELETE** (unfollow)
- 401 when not authenticated
- Returns `{ following: false }` on success

---

### `api/feed-route.test.ts` — 4 tests
Mocks `@/lib/auth`, `@/lib/followStore`, `@/lib/reviewStore`.
Tests `GET /api/feed`.

- 401 when not authenticated
- Returns `reviews: []` when following no one
- Returns reviews from all followed users
- Response includes `followedCount`

---

### `api/search-route.test.ts` — 9 tests
Mocks `@/lib/reviewStore.searchReviews`. Tests `GET /api/search`.

- Returns 200 with all reviews when no params given
- Passes `q` keyword to `searchReviews`
- Passes `platform` filter
- Parses `minRating` / `maxRating` as integers
- Passes `classification` filter
- Passes `sort` param
- Returns 400 for invalid `sort` value
- Returns empty results when no reviews match
- Response includes `page` and `limit`

---

## Mocking Strategy

**Prisma** (`lib/` tests): `jest.mock('@/lib/prisma', ...)` replaces the client with
plain `jest.fn()` instances. Tests assert the exact arguments passed to Prisma methods.

**Store functions** (API route tests): `jest.mock('@/lib/reviewStore', ...)` decouples
route handler logic from DB access entirely.

**`jose` ESM fix**: `next/jest` hard-codes `transformIgnorePatterns`. The config uses
`async module.exports` to mutate the pattern after `createJestConfig` resolves:
```js
module.exports = async () => {
  const config = await baseConfig();
  config.transformIgnorePatterns = ['/node_modules/(?!(jose)/)'];
  return config;
};
```

**`jest.resetAllMocks()`** in `beforeEach` — flushes `mockResolvedValueOnce` queues
between tests and prevents mock values from leaking across cases.

---

## Bugs Found and Fixed by TDD

### 1. Spam false positives (`classify.ts`)
`"The game code is buggy"` and `"Click to attack enemies"` were both incorrectly
flagged as spam. Fix: replaced `'code'` → `'promo code'` / `'coupon code'` and
`'click'` → `'click here'`.

### 2. Double DB query in `getStats` (`reviewStore.ts`)
`getStats` called `getUniqueGameTitles()` which internally called `getHelpfulReviews()`
— a second DB round-trip for data already in memory. Fix: replaced with
`new Set(helpful.map(r => r.gameTitle)).size`.

### 3. Missing `countUsers` mock in auth tests
After Phase 6 added first-user-is-admin logic (`countUsers() === 0`), the register
route threw 500 in tests because the mock didn't include `countUsers`. Fix: added
`countUsers: jest.fn().mockResolvedValue(1)` to the mock and `beforeEach` default.

### 4. Missing `followStore` / `auth` mocks in profile route tests
Phase 8 added social counts to `GET /api/profile/[tag]`, importing `followStore`
and `auth`. Existing tests failed 500 until those imports were mocked.

### 5. TypeScript `Set` spread error
`[...new Set(...)]` fails at the TS target used by Next.js. All occurrences replaced
with `Array.from(new Set(...))`.
