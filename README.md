# Gamers' Feedback
### True Reviews by True Gamers

A Next.js web app for authentic game reviews — with AI-powered moderation to catch spam and toxic content before it pollutes the feed.

## Features

- **Submit a Review** — rate a game 1-10, write a detailed review with pros/cons
- **Browse Reviews** — filter by verified/spam/toxic, search by game title
- **AI Classification** — every review is automatically classified as `helpful`, `spam`, or `toxic` using OpenAI GPT-4o-mini (falls back to rule-based if no API key)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Next.js 14 (App Router) |
| Styling | CSS Modules |
| API | Next.js API Routes |
| AI | OpenAI GPT-4o-mini |
| Data | In-memory store (swap for PostgreSQL later) |

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Add your OPENAI_API_KEY to .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── reviews/route.ts    — GET all reviews, POST new review
│   │   ├── classify/route.ts   — POST AI classification
│   │   └── stats/route.ts      — GET platform stats
│   ├── page.tsx                — Main page (all features)
│   ├── page.module.css         — Component styles
│   ├── layout.tsx              — Root layout + fonts
│   └── globals.css             — Global styles + design tokens
├── lib/
│   └── reviewStore.ts          — In-memory data store
└── types/
    └── index.ts                — Shared TypeScript types
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews` | Get reviews (filter by `?filter=helpful` or `?game=title`) |
| POST | `/api/reviews` | Submit a new review |
| POST | `/api/classify` | AI-classify a review by ID |
| GET | `/api/stats` | Get platform statistics |

## Phase 2 — Zapier Integration (coming next)

When a review is submitted:
1. Webhook fires to Zapier with the review data
2. AI by Zapier classifies urgency
3. Filter step guards against unexpected output
4. Paths branch: urgent → Slack DM, normal → Google Sheet, spam → archive
5. Email summary sent for verified reviews

## Phase 3 — RAG Integration (coming next)

A `/api/ask` endpoint will allow players to ask questions answered from the review knowledge base:
- "Is Elden Ring worth buying on PC?"
- "What do reviewers say about BG3's co-op?"
- "Which games have the best combat systems according to reviewers?"
