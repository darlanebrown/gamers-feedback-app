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
| `lib/reviewStore` | `lib/reviewStore.test.ts` | 16 |
| `lib/auth` | `lib/auth.test.ts` | 5 |
| `lib/adminMiddleware` | `lib/adminMiddleware.test.ts` | 4 |
| `lib/gameService` | `lib/gameService.test.ts` | 6 |
| `lib/voteStore` | `lib/voteStore.test.ts` | 5 |
| `lib/followStore` | `lib/followStore.test.ts` | 8 |
| `lib/alertService` | `lib/alertService.test.ts` | 5 |
| `lib/notificationStore` | `lib/notificationStore.test.ts` | 5 |
| `lib/draftStore` | `lib/draftStore.test.ts` | 6 |
| `lib/leaderboardStore` | `lib/leaderboardStore.test.ts` | 6 |
| `lib/embeddingService` | `lib/embeddingService.test.ts` | 5 |
| `lib/reviewEmbeddings` | `lib/reviewEmbeddings.test.ts` | 6 |
| `lib/askService` | `lib/askService.test.ts` | 5 |
| `api/reviews` | `api/reviews.test.ts` | 16 |
| `api/classify` | `api/classify.test.ts` | 7 |
| `api/auth` | `api/auth.test.ts` | 11 |
| `api/profile-route` | `api/profile-route.test.ts` | 7 |
| `api/admin-reviews` | `api/admin-reviews.test.ts` | 8 |
| `api/admin-users` | `api/admin-users.test.ts` | 10 |
| `api/admin-alerts` | `api/admin-alerts.test.ts` | 4 |
| `api/admin-alerts-route` | `api/admin-alerts-route.test.ts` | 4 |
| `api/game-route` | `api/game-route.test.ts` | 3 |
| `api/vote-route` | `api/vote-route.test.ts` | 6 |
| `api/follow-route` | `api/follow-route.test.ts` | 6 |
| `api/feed-route` | `api/feed-route.test.ts` | 4 |
| `api/search-route` | `api/search-route.test.ts` | 9 |
| `api/review-by-id-route` | `api/review-by-id-route.test.ts` | 3 |
| `api/settings-route` | `api/settings-route.test.ts` | 8 |
| `api/notifications-route` | `api/notifications-route.test.ts` | 5 |
| `api/drafts-route` | `api/drafts-route.test.ts` | 7 |
| `api/leaderboard-route` | `api/leaderboard-route.test.ts` | 5 |
| `api/ask-route` | `api/ask-route.test.ts` | 5 |
| `lib/gameAnalytics` | `lib/gameAnalytics.test.ts` | 11 |
| `api/game-analytics-route` | `api/game-analytics-route.test.ts` | 4 |
| `lib/trendingService` | `lib/trendingService.test.ts` | 5 |
| `api/trending-route` | `api/trending-route.test.ts` | 4 |
| `lib/recommendationsService` | `lib/recommendationsService.test.ts` | 6 |
| `api/recommendations-route` | `api/recommendations-route.test.ts` | 4 |
| `lib/reviewedGames` | `lib/reviewedGames.test.ts` | 5 |
| `api/games-index-route` | `api/games-index-route.test.ts` | 4 |
| `lib/similarReviews` | `lib/similarReviews.test.ts` | 4 |
| `lib/reviewMutations` | `lib/reviewMutations.test.ts` | 4 |
| `api/review-mutation-route` | `api/review-mutation-route.test.ts` | 6 |
| `api/vote-get-route` | `api/vote-get-route.test.ts` | 3 |
| **Total** | **45 suites** | **287** |

## Test File Structure

```
src/__tests__/
├── lib/
│   ├── classify.test.ts          — pure classification logic (17 tests)
│   ├── reviewStore.test.ts       — Prisma-backed store with mocked DB (16 tests)
│   ├── auth.test.ts              — JWT sign/verify round-trips (5 tests)
│   ├── adminMiddleware.test.ts   — requireAdmin() guard (4 tests)
│   ├── gameService.test.ts       — RAWG fetch + 7-day cache logic (6 tests)
│   ├── voteStore.test.ts         — upvote/downvote upsert & counts (5 tests)
│   ├── followStore.test.ts       — follow/unfollow/isFollowing (8 tests)
│   ├── alertService.test.ts      — review bombing detection logic (5 tests)
│   ├── notificationStore.test.ts — notification CRUD (5 tests)
│   ├── draftStore.test.ts        — draft upsert/delete (6 tests)
│   ├── leaderboardStore.test.ts  — top reviewers + top games queries (6 tests)
│   ├── embeddingService.test.ts  — buildReviewText + generateEmbedding + embedAndStore (5 tests)
│   ├── reviewEmbeddings.test.ts  — storeEmbedding + findSimilarReviews raw SQL (6 tests)
│   ├── askService.test.ts        — askQuestion RAG flow (5 tests)
│   ├── gameAnalytics.test.ts     — getGameAnalytics + ratingTrend sparkline data (11 tests)
│   ├── trendingService.test.ts   — getTrendingGames rolling-window groupBy (5 tests)
│   ├── recommendationsService.test.ts — collaborative-filtering recommendations (6 tests)
│   ├── reviewedGames.test.ts         — getReviewedGames groupBy + sort + pagination (5 tests)
│   └── similarReviews.test.ts        — findSimilarReviewsById subquery via pgvector (4 tests)
└── api/
    ├── reviews.test.ts           — GET + POST /api/reviews (16 tests)
    ├── classify.test.ts          — POST /api/classify (7 tests)
    ├── auth.test.ts              — register/login/logout/me routes (11 tests)
    ├── profile-route.test.ts     — GET /api/profile/[tag] (7 tests)
    ├── admin-reviews.test.ts     — GET + PATCH /api/admin/reviews (8 tests)
    ├── admin-users.test.ts       — GET + PATCH /api/admin/users (10 tests)
    ├── admin-alerts.test.ts      — GET /api/admin/alerts (4 tests)
    ├── admin-alerts-route.test.ts — GET + PATCH /api/admin/alerts/[id] (4 tests)
    ├── game-route.test.ts        — GET /api/games/[title] (3 tests)
    ├── vote-route.test.ts        — POST + DELETE /api/reviews/[id]/vote (6 tests)
    ├── follow-route.test.ts      — POST + DELETE /api/profile/[tag]/follow (6 tests)
    ├── feed-route.test.ts        — GET /api/feed (4 tests)
    ├── search-route.test.ts      — GET /api/search (9 tests)
    ├── review-by-id-route.test.ts — GET /api/reviews/[id] (3 tests)
    ├── settings-route.test.ts    — PATCH + DELETE /api/auth/me (8 tests)
    ├── notifications-route.test.ts — GET + PATCH /api/notifications (5 tests)
    ├── drafts-route.test.ts      — GET + PUT + DELETE /api/drafts (7 tests)
    ├── leaderboard-route.test.ts — GET /api/leaderboard (5 tests)
    ├── ask-route.test.ts         — GET /api/ask?q= (5 tests)
    ├── game-analytics-route.test.ts — GET /api/games/[title]/analytics (4 tests)
    ├── trending-route.test.ts    — GET /api/trending (4 tests)
    ├── recommendations-route.test.ts — GET /api/recommendations (4 tests)
    ├── games-index-route.test.ts    — GET /api/games index (4 tests)
    ├── review-mutation-route.test.ts — PATCH + DELETE /api/reviews/[id] (6 tests)
    └── vote-get-route.test.ts        — GET /api/reviews/[id]/vote (3 tests)
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

### `lib/reviewStore.test.ts` — 16 tests
Mocks `@/lib/prisma` and tests each store function in isolation.

- `getAllReviews` — ordered `createdAt desc`, maps `null` reason to `undefined` (3 tests)
- `getHelpfulReviews` — passes correct `where` clause
- `getReviewsByGame` — case-insensitive contains, helpful-only
- `addReview` — always stores `classification: 'pending'`; callers cannot override (2 tests)
- `updateReviewClassification` — writes correct fields; omits reason when not provided (2 tests)
- `getStats` — correct counts, `avgRating` from helpful only, uniqueGames deduped, **single DB query** (regression guard) (5 tests)
- `getRecentReviewCountByTag` — queries by `reviewerTag` + `createdAt >= since`; returns 0 when no matches (2 tests)

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

### `lib/alertService.test.ts` — 5 tests
Tests review bombing detection in `src/lib/alertService.ts`. Mocks `prisma.review` and `prisma.alert`.

**`checkForBombing`**
- Creates an `Alert` record when ≥ 5 low-rated reviews (≤ 3) exist within the last hour and no open alert exists
- Does **not** create an alert when the count is below the threshold (< 5)
- Does **not** create a duplicate when an undismissed alert for the same game already exists

**`getActiveAlerts`**
- Returns only undismissed alerts, ordered by `detectedAt` desc

**`dismissAlert`**
- Marks the alert `dismissed: true` and sets `dismissedAt` to the current time

---

### `lib/notificationStore.test.ts` — 5 tests
Tests notification CRUD in `src/lib/notificationStore.ts`. Mocks `prisma.notification`.

- `createNotification` — calls `prisma.notification.create` with all provided fields
- `getNotifications` — queries with `take: 30`, ordered `createdAt desc`
- `getUnreadCount` — counts only `read: false` records for the given `userTag`
- `markAllRead` — calls `updateMany` with `{ userTag, read: false }` → `{ read: true }`
- `markRead` — calls `update` on a single notification by `id`

---

### `api/reviews.test.ts` — 16 tests
Mocks `@/lib/reviewStore`, `@/lib/alertService`, and `@/lib/embeddingService`. Tests `GET` + `POST /api/reviews`.

**GET** (4 tests)
- No params → calls `getAllReviews`
- `?filter=helpful` → calls `getHelpfulReviews`
- `?game=Hades` → calls `getReviewsByGame('Hades')`
- Game param takes priority over filter param

**POST validation** (7 tests — rejects invalid input before hitting the store)
- Rating below 1 → 400
- Rating above 10 → 400
- Headline < 5 chars → 400
- Headline > 120 chars → 400
- Body < 20 chars → 400
- Invalid platform → 400
- Game title < 2 chars → 400

**POST happy path** (2 tests)
- Valid body → 201 + review in response
- Store throws → 500 + `{ error: 'Failed to create review' }`

**POST rate limiting** (3 tests)
- Reviewer at limit (3 reviews/hour) → 429 with `retryAfter` field
- `retryAfter` is a number ≤ 3600 seconds
- Reviewer under the limit → 201 as normal

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
Mocks `@/lib/adminMiddleware`, `@/lib/reviewStore`, `@/lib/notificationStore`.
Tests admin review routes.

**GET /api/admin/reviews**
- 401 when not authenticated
- 403 when not admin
- Returns all reviews for admin
- `?filter=spam` returns only spam reviews

**PATCH /api/admin/reviews/[id]**
- 401 when not authenticated
- 404 when review not found
- Overrides classification, fires reclassify notification, returns updated review
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

### `api/admin-alerts.test.ts` — 4 tests
Mocks `@/lib/adminMiddleware` and `@/lib/alertService`.
Tests `GET /api/admin/alerts` (persistent alert approach).

- 401 when not authenticated
- 403 when not admin
- Returns active (undismissed) alerts for admin
- Returns empty list when no active alerts

---

### `api/admin-alerts-route.test.ts` — 4 tests
Mocks `@/lib/adminMiddleware` and `@/lib/alertService`.
Tests `GET /api/admin/alerts` and `PATCH /api/admin/alerts/[id]`.

**GET**
- Returns 401 when `requireAdmin` blocks the request
- Returns active alerts with game title and count

**PATCH** (dismiss)
- Returns 401 when `requireAdmin` blocks the request
- Calls `dismissAlert(id)` and returns the updated alert record

---

### `api/game-route.test.ts` — 3 tests
Mocks `@/lib/gameService`. Tests `GET /api/games/[title]`.

- Returns 200 with `{ game: { title, metacritic, developer, ... } }` when found
- Returns 404 when `getOrFetchGame` returns null
- Passes the decoded title string to `getOrFetchGame`

---

### `api/vote-route.test.ts` — 6 tests
Mocks `@/lib/auth`, `@/lib/voteStore`, `@/lib/reviewStore`, `@/lib/notificationStore`.
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
Mocks `@/lib/auth`, `@/lib/followStore`, `@/lib/userStore`, `@/lib/notificationStore`.
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

### `api/review-by-id-route.test.ts` — 3 tests
Mocks `@/lib/reviewStore`. Tests `GET /api/reviews/[id]`.

- Returns 200 with the full review object when found
- Returns 404 with `{ error: 'Review not found' }` when `getReviewById` returns null
- Calls `getReviewById` with the correct `id` param

---

### `api/settings-route.test.ts` — 8 tests
Mocks `@/lib/userStore`, `@/lib/auth`, `bcryptjs`.
Tests `PATCH` + `DELETE /api/auth/me`.

**PATCH** (update profile or password)
- 401 when not authenticated
- Updates `displayName` and `bio` when provided
- 400 when `newPassword` is provided without `currentPassword`
- 401 when `currentPassword` does not match the stored hash
- Hashes and saves the new password when `currentPassword` is correct
- 400 when `newPassword` is shorter than 8 characters

**DELETE** (delete account)
- 401 when not authenticated
- Calls `anonymizeUser(id)` and returns 200

---

### `api/notifications-route.test.ts` — 5 tests
Mocks `@/lib/notificationStore` and `@/lib/auth`.
Tests `GET` + `PATCH /api/notifications`.

**GET**
- 401 when not authenticated
- Returns `{ notifications, unreadCount }` for the authenticated user; calls both store functions with the session's `gamerTag`

**PATCH** (mark read)
- 401 when not authenticated
- Calls `markAllRead(gamerTag)` when no `id` is provided in the body
- Calls `markRead(id)` when a specific `id` is provided

---

### `lib/draftStore.test.ts` — 6 tests
Mocks `@/lib/prisma`. Tests draft CRUD in `src/lib/draftStore.ts`.

- `getDraft` — queries by `reviewerTag`; returns `null` when none exists (2 tests)
- `upsertDraft` — creates draft when none exists; updates headline on existing draft (2 tests)
- `deleteDraft` — calls `deleteMany` with `reviewerTag`; no-op (count 0) does not throw (2 tests)

---

### `api/drafts-route.test.ts` — 7 tests
Mocks `@/lib/draftStore` and `@/lib/auth`. Tests `GET` + `PUT` + `DELETE /api/drafts`.

**GET** (3 tests)
- 401 when not authenticated
- Returns draft for the authenticated user
- Returns `{ draft: null }` when no draft exists

**PUT** (2 tests)
- 401 when not authenticated
- Calls `upsertDraft(gamerTag, fields)` and returns saved draft

**DELETE** (2 tests)
- 401 when not authenticated
- Calls `deleteDraft(gamerTag)` and returns `{ ok: true }`

---

### `lib/leaderboardStore.test.ts` — 6 tests
Mocks `@/lib/prisma`. Tests `getTopReviewers` and `getTopGames`.

- `getTopReviewers` — calls `$queryRaw`; converts BigInt fields to numbers; returns empty array when no data
- `getTopGames` — groups helpful reviews by `gameTitle`; rounds `avgRating` to 1 decimal; returns empty array when no data

---

### `api/leaderboard-route.test.ts` — 5 tests
Mocks `@/lib/leaderboardStore`. Tests `GET /api/leaderboard`.

- Returns 200 with `topReviewers` and `topGames` arrays
- Includes correct reviewer fields (`reviewerTag`, `reputation`, `reviewCount`)
- Includes correct game fields (`gameTitle`, `avgRating`, `reviewCount`)
- Calls both store functions with `limit: 10`
- Returns empty arrays when no data

---

### `lib/embeddingService.test.ts` — 5 tests
Mocks `openai` and `@/lib/reviewStore`. Tests `buildReviewText`, `generateEmbedding`, `embedAndStore`.

- `buildReviewText` — concatenates gameTitle, headline, body, pros, cons; handles empty strings
- `generateEmbedding` — calls `openai.embeddings.create` with `text-embedding-3-small`; returns number array
- `embedAndStore` — builds text, generates embedding, calls `storeEmbedding(id, embedding)`

---

### `lib/reviewEmbeddings.test.ts` — 6 tests
Mocks `@/lib/prisma`. Tests `storeEmbedding` and `findSimilarReviews` in `src/lib/reviewStore.ts`.

- `storeEmbedding` — calls `$executeRaw` once; formats embedding as `[x,y,z]` vector string (second template arg)
- `findSimilarReviews` — calls `$queryRaw` with `<=>` cosine distance operator; maps raw rows to `Review` objects; converts numeric fields; returns empty array when no results

---

### `lib/askService.test.ts` — 5 tests
Mocks `openai`, `@/lib/embeddingService`, `@/lib/reviewStore`. Tests `askQuestion`.

- Returns fallback message when `OPENAI_API_KEY` is not set; skips embedding call
- Embeds question and calls `findSimilarReviews` with the embedding and limit 5
- Returns no-results message and skips synthesis when no similar reviews found
- Calls GPT-4o-mini for synthesis
- Returns `{ answer, sources }` with the synthesized text and source reviews

---

### `api/ask-route.test.ts` — 5 tests
Mocks `@/lib/askService`. Tests `GET /api/ask`.

- Returns 400 when `?q=` param is missing
- Returns 400 when `?q=` is empty string
- Calls `askQuestion` with the decoded query string; returns 200
- Response body contains `answer` and `sources`
- Returns 500 when `askQuestion` throws

---

### `lib/gameAnalytics.test.ts` — 11 tests
Mocks `@/lib/prisma`. Tests `getGameAnalytics` in `src/lib/gameAnalytics.ts`.

- Returns zero counts and empty arrays when no reviews exist
- Counts helpful / spam / toxic correctly from classification field
- Computes `avgRating` from helpful reviews only; rounds to 1 decimal
- Returns 0 `avgRating` when no helpful reviews exist
- Builds `platformBreakdown` sorted by count descending from helpful reviews
- Extracts `topPros` and `topCons` by term frequency (splits on `,`, `\n`, `;`)
- Case-insensitive `gameTitle` match via `contains` + `mode: insensitive`
- `ratingTrend` is empty array when no reviews exist
- Groups helpful reviews into ISO-week trend points (excludes spam/toxic)
- Trend points are sorted chronologically by week string
- Rounds weekly `avgRating` to 1 decimal place

---

### `api/game-analytics-route.test.ts` — 4 tests
Mocks `@/lib/gameAnalytics`. Tests `GET /api/games/[title]/analytics`.

- Returns 200 with `{ analytics }` object for a known game
- Passes decoded `title` param to `getGameAnalytics`
- Returns 500 when `getGameAnalytics` throws
- `analytics` object contains all expected fields (`avgRating`, `platformBreakdown`, `topPros`, `topCons`)

---

### `lib/trendingService.test.ts` — 5 tests
Mocks `@/lib/prisma`. Tests `getTrendingGames` in `src/lib/trendingService.ts`.

- Returns empty array when no reviews exist in the rolling window
- Passes a `createdAt.gte` cutoff within the expected day range to `groupBy`
- Passes `take` equal to the requested limit
- Maps rows to `TrendingGame` shape (`gameTitle`, `reviewCount`, `avgRating`)
- Rounds `avgRating` to 1 decimal place

---

### `api/trending-route.test.ts` — 4 tests
Mocks `@/lib/trendingService`. Tests `GET /api/trending`.

- Returns 200 with `{ trending }` array
- Calls `getTrendingGames` with `limit: 6` and `days: 7`
- Each trending item contains `gameTitle`, `reviewCount`, and `avgRating`
- Returns 500 when `getTrendingGames` throws

---

### `lib/recommendationsService.test.ts` — 6 tests
Mocks `@/lib/prisma`. Tests `getRecommendations` in `src/lib/recommendationsService.ts`.

- Returns empty array when the reviewer has no reviews
- Returns empty array when no other reviewer shares the same game
- Recommends games reviewed by similar reviewers that the target has not reviewed
- Does not recommend games the target reviewer has already reviewed
- Only recommends helpful-classified reviews (excludes spam/toxic)
- Result items have `gameTitle`, `avgRating`, and `reviewCount` fields

---

### `api/recommendations-route.test.ts` — 4 tests
Mocks `@/lib/recommendationsService`. Tests `GET /api/recommendations`.

- Returns 400 when `reviewerTag` param is missing
- Returns 200 with `{ recommendations }` array
- Calls `getRecommendations` with decoded tag and `limit: 6`
- Returns 500 when `getRecommendations` throws

---

### `lib/reviewedGames.test.ts` — 5 tests
Mocks `@/lib/prisma`. Tests `getReviewedGames` in `src/lib/gameAnalytics.ts`.

- Returns empty array when no helpful reviews exist
- Passes `take` (limit) and `skip` (offset) to `groupBy`
- Maps rows to `ReviewedGame` shape (`gameTitle`, `reviewCount`, `avgRating`)
- Rounds `avgRating` to 1 decimal place
- Orders by `_avg.rating` descending when `sort` is `"rating"`

---

### `api/games-index-route.test.ts` — 4 tests
Mocks `@/lib/gameAnalytics`. Tests `GET /api/games` (index route).

- Returns 200 with `{ games }` array
- Passes `sort`, `limit`, and `offset` from query params
- Defaults to `sort: 'reviews'`, `limit: 24`, `offset: 0`
- Returns 500 when `getReviewedGames` throws

---

### `lib/similarReviews.test.ts` — 4 tests
Mocks `@/lib/prisma`. Tests `findSimilarReviewsById` in `src/lib/reviewStore.ts`.

- Returns empty array when no similar reviews exist
- Calls `$queryRaw` exactly once (single subquery, no round-trip for embedding)
- Maps raw rows to full `Review` objects
- Converts numeric `rating` field from raw DB string to number

---

### `lib/reviewMutations.test.ts` — 4 tests
Mocks `@/lib/prisma`. Tests `updateReview` and `deleteReview` in `src/lib/reviewStore.ts`.

- `updateReview` returns null and skips the DB update when reviewer tag doesn't match
- `updateReview` resets `classification` to `'pending'` and clears `classificationReason` on every edit
- `deleteReview` returns false and skips the DB delete when reviewer tag doesn't match
- `deleteReview` calls `prisma.review.delete` and returns true when reviewer matches

---

### `api/review-mutation-route.test.ts` — 6 tests
Mocks `@/lib/reviewStore` and `@/lib/auth`. Tests `PATCH` + `DELETE /api/reviews/[id]`.

**PATCH** (3 tests)
- 401 when not authenticated
- 404 when `updateReview` returns null (review not found or not owner)
- 200 with updated review on success

**DELETE** (3 tests)
- 401 when not authenticated
- 403 when the authenticated user doesn't own the review and is not admin
- 200 with `{ ok: true }` when owner deletes their review

---

### `api/vote-get-route.test.ts` — 3 tests
Mocks `@/lib/auth` and `@/lib/voteStore`. Tests `GET /api/reviews/[id]/vote`.

- Returns votes and `null` userVote when not authenticated; never calls `getUserVote`
- Returns votes and `userVote` when authenticated; calls `getUserVote` with correct args
- Returns zero counts when no votes exist for the review

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

**`jest.resetAllMocks()` + fire-and-forget imports**: Routes that call
`someAsyncFn(...).catch(() => {})` fire-and-forget require the mock to return a
Promise after `resetAllMocks()` clears it. Pattern: declare the mock ref, then
restore `mockResolvedValue(undefined)` in `beforeEach` alongside `resetAllMocks()`.
Failing to do this causes a `TypeError: Cannot read properties of undefined (reading 'catch')`
inside the route handler, surfacing as an unexpected 500.

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

### 6. `resetAllMocks()` wipes fire-and-forget mock implementations
Phase 12 added `checkForBombing(review.gameTitle).catch(() => {})` to the reviews
POST route. Tests that called `jest.resetAllMocks()` in `beforeEach` wiped the
`mockResolvedValue(undefined)` set in the `jest.mock(...)` factory, causing
`checkForBombing` to return `undefined` synchronously. Calling `.catch()` on
`undefined` threw a `TypeError` inside the route, producing an unexpected 500.
Fix: import the mock reference explicitly and call `mockCheckBombing.mockResolvedValue(undefined)`
inside `beforeEach` after `resetAllMocks()`. Same fix applied in Phase 13 for
`createNotification` in follow, vote, and admin-reviews tests.
