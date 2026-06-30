# Gamers' Feedback — Product Roadmap

**True Reviews by True Gamers**

This document captures the long-term vision, architecture evolution, and feature roadmap
for Gamers' Feedback — from current MVP through a real, scalable product.

---

## Current State — MVP (Phase 1)

**What's built:**
- React + Next.js 14 full-stack web app
- Submit a game review with rating, headline, pros/cons, hours played
- Browse reviews by game title, filter by classification
- AI-powered review classification (helpful / spam / toxic) via OpenAI GPT-4o-mini
- Rule-based fallback classification when no API key is configured
- In-memory data store with 5 seeded reviews
- Live stats bar (total reviews, verified count, games covered, avg rating, spam caught)
- Python RAG pipeline demo (separate script) for answering questions from review content

**Tech stack:**
| Layer | Technology |
|-------|-----------|
| Frontend | React + Next.js 14 (App Router) |
| Styling | CSS Modules (dark gaming aesthetic) |
| API | Next.js API Routes (JavaScript) |
| AI Classification | OpenAI GPT-4o-mini |
| Data | In-memory store (resets on server restart) |
| RAG Demo | Python (OpenAI + numpy + python-dotenv) |

**Limitations:**
- Reviews are lost when the server restarts (no real database)
- No user authentication — anyone can post as any gamer tag
- Python AI logic lives in a separate script, not integrated into the web app
- No real search — just string matching on game titles
- No recommendations, trends, or analytics

---

## Phase 2 — Real Data + Zapier Automation

**Goal:** Make the app persistent and wire up automated workflows.

### Database
Replace the in-memory store with a real PostgreSQL database:
- **Neon** (serverless Postgres) or **Supabase** — both have free tiers
- Use **Prisma ORM** to define the schema and query the database
- Reviews persist across server restarts
- Game titles become queryable with real SQL filters

**Schema:**
```sql
reviews (
  id          UUID PRIMARY KEY,
  game_title  TEXT NOT NULL,
  platform    TEXT NOT NULL,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 10),
  headline    TEXT NOT NULL,
  body        TEXT NOT NULL,
  pros        TEXT,
  cons        TEXT,
  playtime    TEXT,
  reviewer_tag TEXT NOT NULL,
  classification TEXT DEFAULT 'pending',
  classification_reason TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
)
```

### Zapier Automation (6-step Zap)
When a new review is submitted:
1. **Trigger** — Webhook fires to Zapier with full review payload
2. **AI by Zapier** — classify as urgent / normal / spam
3. **Filter by Zapier** — error guard (only continue if output is one of the three values)
4. **Paths by Zapier** — branch on classification:
   - Urgent → Slack DM immediately
   - Normal → Log to Google Sheet
   - Spam → Archive
5. **Formatter by Zapier** — clean and format the review text
6. **Email by Zapier** — formatted summary to admin

**Fallback Zap:** fires when Filter blocks, sends raw payload for manual review.

### Milestone
- [ ] PostgreSQL connected via Prisma
- [ ] Reviews persist across restarts
- [ ] Zapier webhook fires on every new review submission
- [ ] All 6 Zap steps tested with Zap History screenshots
- [ ] Fallback Zap tested and documented

---

## Phase 3 — Python Backend + RAG Integration

**Goal:** Separate frontend and backend into their own layers.
Python takes over the server side. React stays on the frontend.

### Architecture Change

```
┌─────────────────────┐         ┌─────────────────────┐
│   React Frontend    │  HTTP   │   Python Backend    │
│   (Next.js)         │ ──────► │   (FastAPI)         │
│                     │         │                     │
│  - Review feed      │         │  - /reviews GET/POST│
│  - Submit modal     │         │  - /classify POST   │
│  - Search/filter    │         │  - /ask POST (RAG)  │
│  - Stats bar        │         │  - /stats GET       │
└─────────────────────┘         └─────────────────────┘
                                         │
                                         ▼
                                ┌─────────────────────┐
                                │   PostgreSQL        │
                                │   + pgvector        │
                                │                     │
                                │  - reviews table    │
                                │  - embeddings table │
                                └─────────────────────┘
```

### Python FastAPI Backend
Replace Next.js API routes with a Python FastAPI server:

```python
# Example endpoint structure
POST /api/reviews          # submit a new review
GET  /api/reviews          # get reviews with filters
POST /api/classify         # AI classification
GET  /api/stats            # platform statistics
POST /api/ask              # RAG — answer questions from reviews
```

**Why FastAPI:**
- Fast, modern Python web framework
- Automatic API documentation (Swagger UI built in)
- Native async support
- Python typing — similar discipline to TypeScript
- Easy to add ML libraries alongside it

### RAG Integration (the /api/ask endpoint)
The Python RAG demo script becomes a real live API endpoint:

```
User asks: "Is Elden Ring worth buying on PC?"
         ↓
Embed the question (text-embedding-3-small)
         ↓
Search pgvector for similar review chunks
         ↓
Retrieve top 5 most relevant review excerpts
         ↓
Inject into GPT-4o-mini prompt as context
         ↓
Return grounded answer citing real reviews
```

Instead of searching three markdown files, the RAG system searches the actual
review database — thousands of real player opinions answering real player questions.

### pgvector
Store review embeddings directly in PostgreSQL using the pgvector extension:
```sql
reviews (
  ...existing columns...,
  embedding vector(1536)  -- text-embedding-3-small dimension
)
```

No separate vector database needed. One database for everything.

### Milestone
- [ ] FastAPI backend running alongside Next.js frontend
- [ ] All API routes migrated from Next.js to Python
- [ ] pgvector installed and embeddings stored per review
- [ ] /api/ask endpoint live and returning grounded answers
- [ ] Frontend updated to call Python backend URLs

---

## Phase 4 — Intelligence Layer

**Goal:** Make the platform genuinely smart about gaming reviews.
This is where Gamers' Feedback becomes a real product, not a class project.

### Review Bombing Detection
Automatically detect coordinated inauthentic activity:
- 50+ negative reviews for the same game within 2 hours → flag for investigation
- Multiple reviews from similar IP ranges with identical patterns → auto-quarantine
- New accounts (created same day) posting about the same game → elevated scrutiny
- Python ML classifier trained on confirmed review bomb events

### Sentiment Trend Analysis
Track how player sentiment changes over time for each game:
- "PC performance complaints spiked 40% this week after the latest patch"
- "Co-op reviews improved significantly after the December update"
- Detect when a publisher patches a problem vs. when they make things worse

### Personalized Recommendations
"Based on your review history, you'd probably like these games":
- Collaborative filtering: find reviewers with similar taste profiles
- Content-based: match game attributes from reviews you rated highly
- Python scikit-learn or a simple embedding similarity approach

### Developer Analytics Dashboard (Revenue Model)
Game studios pay for aggregated, anonymized intelligence about their games:
- Overall sentiment score and trend
- Most common praise themes vs. complaint themes
- How they compare to competitors in the same genre
- Alert when a review bombing event is detected

This is the business model: the platform is free for gamers,
paid for by studios who want honest signal about their own games.

### Milestone
- [ ] Review bombing detection running in background
- [ ] Sentiment trend charts on each game's page
- [ ] Recommendation engine returning meaningful suggestions
- [ ] Developer dashboard mockup built and validated with a real studio

---

## Long-Term Vision

Gamers' Feedback exists because the dominant review platforms have a trust problem.
Metacritic scores are gamed. Steam reviews get bombed. Paid influencer content
masquerades as honest opinion. Players have no reliable signal.

The long-term vision is a platform where the AI layer does the work of separating
genuine signal from noise — not as a moderation afterthought, but as the core product.
Every feature, every technical decision, every architecture choice serves that mission.

**The unfair advantage:** most review platforms were built before AI made
real-time content intelligence possible. Gamers' Feedback is built with AI
as a first-class citizen from day one — which means capabilities that would
take an incumbent years to retrofit are native to this platform from the start.

---

## Technology Evolution Summary

| Phase | Frontend | Backend | Database | AI/ML |
|-------|----------|---------|----------|-------|
| **1 — MVP** | React/Next.js | Next.js API Routes | In-memory | OpenAI API calls |
| **2 — Real Data** | React/Next.js | Next.js API Routes | PostgreSQL/Prisma | OpenAI + Zapier |
| **3 — Python Backend** | React/Next.js | Python FastAPI | PostgreSQL + pgvector | RAG pipeline live |
| **4 — Intelligence** | React/Next.js | Python FastAPI | PostgreSQL + pgvector | Custom ML models |

**The frontend never changes.** React stays because it is the right tool for
building fast, interactive UI and the ecosystem around it is unmatched.

**The backend evolves toward Python** because AI, ML, and data processing
are where Python has no equal — and Gamers' Feedback's long-term value
is entirely in what it does with the data, not how it displays it.

---

*Last updated: June 2026*
*Built by Darla Brown — Next Chapter AI Native Developer Internship*
