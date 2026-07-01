import { NextRequest, NextResponse } from 'next/server';
import { updateReviewClassification } from '@/lib/reviewStore';
import { classifyByRules } from '@/lib/classify';
import { sendClassificationEmail } from '@/lib/emailService';
import { sendClassificationWebhook } from '@/lib/webhookService';

function notifyIfFlagged(
  classification: string,
  reviewId: string,
  gameTitle: string,
  reviewerTag: string,
) {
  if (classification !== 'spam' && classification !== 'toxic') return;
  const c = classification as 'spam' | 'toxic';
  sendClassificationEmail(reviewId, gameTitle, reviewerTag, c).catch(() => {});
  sendClassificationWebhook(reviewId, gameTitle, reviewerTag, c).catch(() => {});
}

export async function POST(req: NextRequest) {
  const { reviewId, headline, body, pros, cons, reviewerTag, gameTitle } = await req.json();

  if (!reviewId || !headline || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const runRuleBased = () => {
    const text = `${headline} ${body} ${pros ?? ''} ${cons ?? ''}`;
    return classifyByRules(text);
  };

  if (!process.env.OPENAI_API_KEY) {
    const { classification, reason } = runRuleBased();
    await updateReviewClassification(reviewId, classification, reason);
    notifyIfFlagged(classification, reviewId, gameTitle ?? '', reviewerTag ?? '');
    return NextResponse.json({ classification, reason, method: 'rule-based' });
  }

  // AI classification — falls back to rule-based if the API call fails
  // so reviews are never left stuck as 'pending'.
  try {
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

    let classification: 'helpful' | 'spam' | 'toxic' = 'helpful';
    let reason = '';

    try {
      const parsed = JSON.parse(content);
      if (['helpful', 'spam', 'toxic'].includes(parsed.classification)) {
        classification = parsed.classification;
        reason = parsed.reason || '';
      }
    } catch {
      if (content.includes('spam')) classification = 'spam';
      else if (content.includes('toxic')) classification = 'toxic';
      reason = 'AI classification (raw parse)';
    }

    await updateReviewClassification(reviewId, classification, reason);
    notifyIfFlagged(classification, reviewId, gameTitle ?? '', reviewerTag ?? '');
    return NextResponse.json({ classification, reason, method: 'ai' });
  } catch (error) {
    console.error('OpenAI classification failed — falling back to rule-based:', error);
    const { classification, reason } = runRuleBased();
    await updateReviewClassification(reviewId, classification, reason);
    notifyIfFlagged(classification, reviewId, gameTitle ?? '', reviewerTag ?? '');
    return NextResponse.json({ classification, reason, method: 'rule-based-fallback' });
  }
}
