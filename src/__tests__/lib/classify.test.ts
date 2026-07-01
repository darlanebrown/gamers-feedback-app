import { classifyByRules } from '@/lib/classify';

describe('classifyByRules', () => {
  describe('spam detection', () => {
    it('detects discount language', () => {
      const result = classifyByRules('Use this discount at checkout');
      expect(result.classification).toBe('spam');
    });

    it('detects giveaway language', () => {
      const result = classifyByRules('Game giveaway click here to enter');
      expect(result.classification).toBe('spam');
    });

    it('detects "free v-bucks" bait', () => {
      const result = classifyByRules('I found free v-bucks in this game!');
      expect(result.classification).toBe('spam');
    });

    it('detects "link in bio" pattern', () => {
      const result = classifyByRules('More info at link in bio subscribe now');
      expect(result.classification).toBe('spam');
    });

    it('is case-insensitive', () => {
      const result = classifyByRules('HUGE DISCOUNT CODE AVAILABLE');
      expect(result.classification).toBe('spam');
    });

    // BUG: 'code' alone is too broad — "The game code is buggy" is not spam
    it('does not flag the word "code" in a non-spam context', () => {
      const result = classifyByRules('The game code is full of bugs and crashes');
      expect(result.classification).toBe('helpful');
    });

    it('returns a reason string', () => {
      const result = classifyByRules('subscribe for a giveaway discount');
      expect(result.reason).toBeTruthy();
    });
  });

  describe('toxic detection', () => {
    it('detects "devs are idiots"', () => {
      const result = classifyByRules('The devs are idiots who ruined this sequel');
      expect(result.classification).toBe('toxic');
    });

    it('detects "worst game ever"', () => {
      const result = classifyByRules('Honestly the worst game ever released');
      expect(result.classification).toBe('toxic');
    });

    it('detects "trash"', () => {
      const result = classifyByRules('This game is complete trash with no redeeming value');
      expect(result.classification).toBe('toxic');
    });

    it('is case-insensitive', () => {
      const result = classifyByRules('GARBAGE GAME DO NOT BUY');
      expect(result.classification).toBe('toxic');
    });
  });

  describe('helpful classification', () => {
    it('classifies genuine positive reviews as helpful', () => {
      const result = classifyByRules(
        'Elden Ring is a masterpiece. Stunning open world, tight combat, incredible boss design.'
      );
      expect(result.classification).toBe('helpful');
    });

    it('classifies genuine critical reviews as helpful', () => {
      const result = classifyByRules(
        'Disappointing sequel. The story is weak and the frame rate tanks on PC.'
      );
      expect(result.classification).toBe('helpful');
    });

    it('handles empty strings without crashing', () => {
      const result = classifyByRules('');
      expect(result.classification).toBe('helpful');
    });

    it('classifies reviews mentioning "cheat codes" as helpful (not spam)', () => {
      const result = classifyByRules('The cheat codes in this game are fun to use');
      expect(result.classification).toBe('helpful');
    });

    it('classifies "click to attack" gameplay descriptions as helpful', () => {
      const result = classifyByRules('You click to attack and it feels responsive');
      expect(result.classification).toBe('helpful');
    });
  });

  describe('spam takes priority over toxic when both signals present', () => {
    it('returns spam when text has both spam and toxic signals', () => {
      const result = classifyByRules('Subscribe for a discount you idiots');
      expect(result.classification).toBe('spam');
    });
  });
});
