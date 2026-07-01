export type ClassificationResult = {
  classification: 'helpful' | 'spam' | 'toxic';
  reason: string;
};

// 'code' and 'click' removed — too broad, caused false positives on
// phrases like "cheat codes", "error code", "click to attack".
const SPAM_SIGNALS = [
  'discount', 'promo code', 'coupon code', 'click here',
  'free v-bucks', 'subscribe', 'link in bio', 'giveaway',
];

const TOXIC_SIGNALS = [
  'stupid', 'trash', 'garbage', 'idiot',
  'worst game ever', 'devs are idiots',
];

export function classifyByRules(text: string): ClassificationResult {
  const lower = text.toLowerCase();

  if (SPAM_SIGNALS.some((s) => lower.includes(s))) {
    return { classification: 'spam', reason: 'Detected promotional/spam language' };
  }
  if (TOXIC_SIGNALS.some((s) => lower.includes(s))) {
    return { classification: 'toxic', reason: 'Detected toxic language' };
  }
  return { classification: 'helpful', reason: 'Rule-based classification (no AI key configured)' };
}
