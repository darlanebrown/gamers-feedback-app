// src/app/api/classify/route.ts
// AI-powered review classification: helpful | spam | toxic
// This is the endpoint Zapier will also call in Phase 2

import { NextRequest, NextResponse } from 'next/server';
import { updateReviewClassification } from '@/lib/reviewStore';
import { classifyByRules } from '@/lib/classify';

export async function POST(req: NextRequest) {
  try {
    const { reviewId, headline, body, pros, cons, reviewerTag } = await req.json();

    if (!reviewId || !headline || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      const text = `${headline} ${body} ${pros ?? ''} ${cons ?? ''}`;
      const { classification, reason } = classifyByRules(text);
      await updateReviewClassification(reviewId, classification, reason);
      return NextResponse.json({ classification, reason, method: 'rule-based' });
    }

    // AI classification using OpenAI
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are a moderation system for a gaming review platform called Gamers' Feedback.

Classify this game review as exactly one of: helpful, spam, or toxic.

Definitions:
- helpful: A genuine game review with real opinions, whether positive or negative. Includes constructive criticism.
- spam: Promotional content, discount codes, fake reviews, off-topic content, or bot-generated text.
- toxic: Personal attacks, hate speech, or content designed to harass rather than review the game.

Review to classify:
Headline: ${headline}
Body: ${body}
Pros: ${pros || 'none listed'}
Cons: ${cons || 'none listed'}
Reviewer tag: ${reviewerTag}

Respond with ONLY valid JSON in this exact format:
{"classification": "helpful|spam|toxic", "reason": "one sentence explanation"}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 100,
    });

    const content = response.choices[0].message.content?.trim() || '';

    // Parse and validate the AI response
    let classification: 'helpful' | 'spam' | 'toxic' = 'helpful';
    let reason = '';

    try {
      const parsed = JSON.parse(content);
      if (['helpful', 'spam', 'toxic'].includes(parsed.classification)) {
        classification = parsed.classification;
        reason = parsed.reason || '';
      }
    } catch {
      // If JSON parse fails, try to extract the word directly
      if (content.includes('spam')) classification = 'spam';
      else if (content.includes('toxic')) classification = 'toxic';
      reason = 'AI classification (raw parse)';
    }

    await updateReviewClassification(reviewId, classification, reason);
    return NextResponse.json({ classification, reason, method: 'ai' });
  } catch (error) {
    console.error('Classification error:', error);
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 });
  }
}
