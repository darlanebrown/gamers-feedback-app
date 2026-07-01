# Mirrors src/lib/classify.ts — same signals, same priority (spam beats toxic).
# 'code' and 'click' removed: too broad, caused false positives on
# "game code is buggy" and "click to attack".

SPAM_SIGNALS = [
    "discount", "promo code", "coupon code", "click here",
    "free v-bucks", "subscribe", "link in bio", "giveaway",
]

TOXIC_SIGNALS = [
    "stupid", "trash", "garbage", "idiot",
    "worst game ever", "devs are idiots",
]


def classify_by_rules(text: str) -> dict:
    lower = text.lower()
    if any(s in lower for s in SPAM_SIGNALS):
        return {"classification": "spam", "reason": "Detected promotional/spam language"}
    if any(s in lower for s in TOXIC_SIGNALS):
        return {"classification": "toxic", "reason": "Detected toxic language"}
    return {"classification": "helpful", "reason": "Rule-based classification (no AI key configured)"}
