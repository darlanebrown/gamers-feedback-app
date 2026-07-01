import { Review } from '@/types';
import { storeEmbedding } from './reviewStore';

export function buildReviewText(review: {
  gameTitle: string;
  headline: string;
  body: string;
  pros: string;
  cons: string;
}): string {
  return `${review.gameTitle}: ${review.headline}. ${review.body} Pros: ${review.pros}. Cons: ${review.cons}`.trim();
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const { OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return res.data[0].embedding;
}

export async function embedAndStore(review: Review): Promise<void> {
  const text = buildReviewText(review);
  const embedding = await generateEmbedding(text);
  await storeEmbedding(review.id, embedding);
}
