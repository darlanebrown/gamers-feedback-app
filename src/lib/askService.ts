import { Review } from '@/types';
import { generateEmbedding } from './embeddingService';
import { findSimilarReviews } from './reviewStore';

export type AskResult = {
  answer: string;
  sources: Review[];
};

export async function askQuestion(q: string): Promise<AskResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { answer: 'AI Ask requires an OpenAI API key to be configured.', sources: [] };
  }

  const queryEmbedding = await generateEmbedding(q);
  const sources = await findSimilarReviews(queryEmbedding, 5);

  if (sources.length === 0) {
    return { answer: 'No relevant reviews found for your question.', sources: [] };
  }

  const context = sources
    .map((r, i) => `[${i + 1}] ${r.gameTitle} (${r.rating}/10): ${r.headline}. ${r.body}`)
    .join('\n\n');

  const { OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `You are a helpful gaming assistant. Answer the user's question based only on these real game reviews:\n\n${context}\n\nQuestion: ${q}\n\nAnswer concisely in 2-3 sentences.`,
    }],
    temperature: 0.3,
    max_tokens: 200,
  });

  const answer = response.choices[0].message.content?.trim() ?? 'Could not generate an answer.';
  return { answer, sources };
}
