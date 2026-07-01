import json
import os
import uuid
from collections import Counter, defaultdict
from contextlib import asynccontextmanager
from pathlib import Path

import asyncpg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from pydantic import BaseModel, Field, field_validator

from backend.classify import classify_by_rules

_root = Path(__file__).parent.parent
load_dotenv(_root / ".env.local")
load_dotenv(_root / ".env")

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

BOMB_THRESHOLD = int(os.environ.get("BOMB_THRESHOLD", "10"))
BOMB_WINDOW_HOURS = int(os.environ.get("BOMB_WINDOW_HOURS", "2"))

pool: asyncpg.Pool = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    db_url = DATABASE_URL.split("?")[0]
    pool = await asyncpg.create_pool(db_url, ssl="require", min_size=1, max_size=5)
    async with pool.acquire() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        await conn.execute("""
            ALTER TABLE "Review"
            ADD COLUMN IF NOT EXISTS embedding vector(1536)
        """)
    yield
    if pool:
        await pool.close()


app = FastAPI(title="Gamers' Feedback API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ───────────────────────────────────────────────────────────

VALID_PLATFORMS = [
    "PC", "PlayStation 5", "PlayStation 4", "Xbox Series X/S",
    "Xbox One", "Nintendo Switch", "Steam Deck", "Mobile",
]


class ReviewCreate(BaseModel):
    gameTitle:   str = Field(..., min_length=2, max_length=100)
    platform:    str
    rating:      int = Field(..., ge=1, le=10)
    headline:    str = Field(..., min_length=5, max_length=120)
    body:        str = Field(..., min_length=20)
    pros:        str = Field("", max_length=500)
    cons:        str = Field("", max_length=500)
    playtime:    str = Field("", max_length=50)
    reviewerTag: str = Field(..., min_length=2, max_length=50)

    @field_validator("platform")
    @classmethod
    def platform_must_be_valid(cls, v: str) -> str:
        if v not in VALID_PLATFORMS:
            raise ValueError(f"platform must be one of: {', '.join(VALID_PLATFORMS)}")
        return v


class ClassifyRequest(BaseModel):
    reviewId: str
    headline: str
    body: str
    pros: str = ""
    cons: str = ""
    reviewerTag: str = ""


class AskRequest(BaseModel):
    question: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def row_to_review(row) -> dict:
    return {
        "id": row["id"],
        "gameTitle": row["gameTitle"],
        "platform": row["platform"],
        "rating": row["rating"],
        "headline": row["headline"],
        "body": row["body"],
        "pros": row["pros"] or "",
        "cons": row["cons"] or "",
        "playtime": row["playtime"] or "",
        "reviewerTag": row["reviewerTag"],
        "classification": row["classification"],
        "classificationReason": row["classificationReason"],
        "createdAt": row["createdAt"].isoformat(),
    }


def vec_to_str(embedding: list[float]) -> str:
    return "[" + ",".join(str(x) for x in embedding) + "]"


async def get_embedding(text: str) -> list[float]:
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/reviews")
async def get_reviews(filter: str = None, game: str = None):
    async with pool.acquire() as conn:
        if game:
            rows = await conn.fetch(
                """SELECT * FROM "Review"
                   WHERE LOWER("gameTitle") LIKE LOWER($1)
                   AND classification = 'helpful'
                   ORDER BY "createdAt" DESC""",
                f"%{game}%",
            )
        elif filter == "helpful":
            rows = await conn.fetch(
                """SELECT * FROM "Review"
                   WHERE classification = 'helpful'
                   ORDER BY "createdAt" DESC"""
            )
        else:
            rows = await conn.fetch(
                """SELECT * FROM "Review" ORDER BY "createdAt" DESC"""
            )
    return {"reviews": [row_to_review(r) for r in rows]}


@app.post("/api/reviews", status_code=201)
async def create_review(body: ReviewCreate):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO "Review"
               ("id","gameTitle","platform","rating","headline","body",
                "pros","cons","playtime","reviewerTag","classification","createdAt")
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',NOW())
               RETURNING *""",
            str(uuid.uuid4()),
            body.gameTitle, body.platform, body.rating,
            body.headline, body.body,
            body.pros, body.cons, body.playtime, body.reviewerTag,
        )
    return {"review": row_to_review(row)}


@app.post("/api/classify")
async def classify_review(body: ClassifyRequest):
    text = f"{body.headline} {body.body} {body.pros} {body.cons}"

    if not OPENAI_API_KEY:
        result = classify_by_rules(text)
        classification, reason, method = result["classification"], result["reason"], "rule-based"
    else:
        try:
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            prompt = f"""You are a moderation system for a gaming review platform called Gamers' Feedback.

Classify this game review as exactly one of: helpful, spam, or toxic.

Definitions:
- helpful: A genuine game review with real opinions, whether positive or negative.
- spam: Promotional content, discount codes, fake reviews, or bot-generated text.
- toxic: Personal attacks, hate speech, or content designed to harass.

Review:
Headline: {body.headline}
Body: {body.body}
Pros: {body.pros or 'none listed'}
Cons: {body.cons or 'none listed'}
Reviewer tag: {body.reviewerTag}

Respond with ONLY valid JSON: {{"classification": "helpful|spam|toxic", "reason": "one sentence"}}"""

            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=100,
            )
            content = response.choices[0].message.content.strip()
            parsed = json.loads(content)
            classification = parsed["classification"] if parsed["classification"] in ("helpful", "spam", "toxic") else "helpful"
            reason = parsed.get("reason", "")
            method = "ai"
        except Exception as exc:
            print(f"OpenAI classify failed — rule-based fallback: {exc}")
            result = classify_by_rules(text)
            classification, reason, method = result["classification"], result["reason"], "rule-based-fallback"

    # Generate and store embedding for helpful reviews
    if classification == "helpful" and OPENAI_API_KEY:
        try:
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            embedding = await client.embeddings.create(
                model="text-embedding-3-small",
                input=f"{body.headline} {body.body}",
            )
            vec = vec_to_str(embedding.data[0].embedding)
            async with pool.acquire() as conn:
                await conn.execute(
                    """UPDATE "Review"
                       SET classification=$1, "classificationReason"=$2, embedding=$3::vector
                       WHERE id=$4""",
                    classification, reason, vec, body.reviewId,
                )
            return {"classification": classification, "reason": reason, "method": method}
        except Exception as exc:
            print(f"Embedding failed: {exc}")

    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE "Review"
               SET classification=$1, "classificationReason"=$2
               WHERE id=$3""",
            classification, reason, body.reviewId,
        )
    return {"classification": classification, "reason": reason, "method": method}


@app.get("/api/stats")
async def get_stats():
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM "Review"')

    helpful = [r for r in rows if r["classification"] == "helpful"]
    spam    = [r for r in rows if r["classification"] == "spam"]
    toxic   = [r for r in rows if r["classification"] == "toxic"]

    avg_rating = (
        f"{sum(r['rating'] for r in helpful) / len(helpful):.1f}"
        if helpful else "0"
    )
    unique_games = len({r["gameTitle"] for r in helpful})

    return {
        "total": len(rows),
        "helpful": len(helpful),
        "spam": len(spam),
        "toxic": len(toxic),
        "avgRating": avg_rating,
        "uniqueGames": unique_games,
    }


@app.post("/api/ask")
async def ask(body: AskRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI key not configured")

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    # Embed the question
    embed_response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=body.question,
    )
    vec = vec_to_str(embed_response.data[0].embedding)

    # Similarity search against helpful reviews that have embeddings
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, "gameTitle", headline, body, pros, cons, rating, "reviewerTag"
               FROM "Review"
               WHERE classification = 'helpful' AND embedding IS NOT NULL
               ORDER BY embedding <=> $1::vector
               LIMIT 5""",
            vec,
        )

    if not rows:
        return {
            "answer": "I don't have enough reviews to answer that yet. Submit some reviews first!",
            "sources": [],
        }

    context = "\n\n".join(
        f"Game: {r['gameTitle']} (Rating: {r['rating']}/10)\n"
        f"Headline: {r['headline']}\n"
        f"Review: {r['body']}\n"
        f"Pros: {r['pros']}\nCons: {r['cons']}"
        for r in rows
    )

    chat_response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful gaming advisor for Gamers' Feedback. "
                    "Answer questions based only on the real player reviews provided. "
                    "Be specific, cite which games you're referencing, and keep answers to 2-4 sentences."
                ),
            },
            {
                "role": "user",
                "content": f"Player reviews:\n{context}\n\nQuestion: {body.question}",
            },
        ],
        temperature=0.3,
        max_tokens=200,
    )

    return {
        "answer": chat_response.choices[0].message.content,
        "sources": [
            {"gameTitle": r["gameTitle"], "headline": r["headline"], "rating": r["rating"]}
            for r in rows
        ],
    }


# ── Phase 4: Intelligence Layer ───────────────────────────────────────────────

@app.get("/api/games/{title}/bomb-check")
async def bomb_check(title: str):
    async with pool.acquire() as conn:
        count = await conn.fetchval(
            """SELECT COUNT(*) FROM "Review"
               WHERE LOWER("gameTitle") = LOWER($1)
               AND (rating <= 4 OR classification = 'toxic')
               AND "createdAt" >= NOW() - ($2 * INTERVAL '1 hour')""",
            title, BOMB_WINDOW_HOURS,
        )
    return {
        "gameTitle": title,
        "isBombing": count >= BOMB_THRESHOLD,
        "negativeReviewsInWindow": count,
        "threshold": BOMB_THRESHOLD,
        "windowHours": BOMB_WINDOW_HOURS,
    }


@app.get("/api/games/{title}/trends")
async def get_trends(title: str):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT
                   DATE_TRUNC('week', "createdAt") AS week,
                   AVG(rating)::float               AS avg_rating,
                   COUNT(*)::int                    AS review_count
               FROM "Review"
               WHERE LOWER("gameTitle") = LOWER($1)
               AND classification = 'helpful'
               GROUP BY DATE_TRUNC('week', "createdAt")
               ORDER BY week""",
            title,
        )

    periods = [
        {
            "week": row["week"].isoformat(),
            "avgRating": round(float(row["avg_rating"]), 1),
            "reviewCount": row["review_count"],
        }
        for row in rows
    ]

    overall_avg = None
    if periods:
        overall_avg = round(sum(p["avgRating"] for p in periods) / len(periods), 1)

    trend = "stable"
    if len(periods) >= 2:
        mid = len(periods) // 2
        first_half_avg = sum(p["avgRating"] for p in periods[:mid]) / mid
        second_half_avg = sum(p["avgRating"] for p in periods[mid:]) / (len(periods) - mid)
        diff = second_half_avg - first_half_avg
        if diff > 0.5:
            trend = "improving"
        elif diff < -0.5:
            trend = "declining"

    return {
        "gameTitle": title,
        "trend": trend,
        "periods": periods,
        "overallAvg": overall_avg,
    }


@app.get("/api/recommendations")
async def get_recommendations(reviewerTag: str = Query(...)):
    async with pool.acquire() as conn:
        reviewer_games = await conn.fetch(
            """SELECT DISTINCT "gameTitle" FROM "Review"
               WHERE "reviewerTag" = $1""",
            reviewerTag,
        )
        recs = await conn.fetch(
            """SELECT "gameTitle",
                      AVG(rating)::float AS avg_rating,
                      COUNT(*)::int      AS review_count
               FROM "Review"
               WHERE classification = 'helpful'
               AND "gameTitle" NOT IN (
                   SELECT DISTINCT "gameTitle" FROM "Review"
                   WHERE "reviewerTag" = $1
               )
               GROUP BY "gameTitle"
               ORDER BY avg_rating DESC, review_count DESC
               LIMIT 5""",
            reviewerTag,
        )

    return {
        "reviewerTag": reviewerTag,
        "recommendations": [
            {
                "gameTitle": r["gameTitle"],
                "avgRating": round(float(r["avg_rating"]), 1),
                "reviewCount": r["review_count"],
            }
            for r in recs
        ],
    }


def _extract_themes(rows: list, field: str) -> list[str]:
    all_text = ", ".join(r[field] or "" for r in rows if r.get(field))
    items = [t.strip() for t in all_text.split(",") if t.strip()]
    return [theme for theme, _ in Counter(items).most_common(5)]


@app.get("/api/analytics/{title}")
async def get_analytics(title: str):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT rating, classification, pros, cons
               FROM "Review"
               WHERE LOWER("gameTitle") = LOWER($1)""",
            title,
        )
        bomb_count = await conn.fetchval(
            """SELECT COUNT(*) FROM "Review"
               WHERE LOWER("gameTitle") = LOWER($1)
               AND (rating <= 4 OR classification = 'toxic')
               AND "createdAt" >= NOW() - ($2 * INTERVAL '1 hour')""",
            title, BOMB_WINDOW_HOURS,
        )

    helpful = [r for r in rows if r["classification"] == "helpful"]
    spam    = [r for r in rows if r["classification"] == "spam"]
    toxic   = [r for r in rows if r["classification"] == "toxic"]

    sentiment_score = None
    if helpful:
        sentiment_score = round(sum(r["rating"] for r in helpful) / len(helpful), 1)

    return {
        "gameTitle": title,
        "totalReviews": len(rows),
        "helpfulCount": len(helpful),
        "spamCount": len(spam),
        "toxicCount": len(toxic),
        "sentimentScore": sentiment_score,
        "topPros": _extract_themes(helpful, "pros"),
        "topCons": _extract_themes(helpful, "cons"),
        "bombAlert": bomb_count >= BOMB_THRESHOLD,
        "trend": "stable",
    }
