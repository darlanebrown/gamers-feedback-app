Exercise 1 — Zapier Automation Submission
Gamers' Feedback Review Classifier
Use case: Automated triage system for incoming game review submissions. When a new review is submitted to Gamers' Feedback, this Zap classifies it using AI, filters out invalid/spam responses, and routes it to the appropriate notification channel based on urgency.

Architecture Overview
8 steps total, organized into 4 functional stages:

1. TRIGGER → Webhooks by Zapier (Catch Hook)
2. AI ANALYSIS → AI by Zapier (Classify)
3. ERROR GUARD → Filter by Zapier
4. BRANCHING → Paths by Zapier
   5/6. Path A (Urgent) → Email by Zapier
   7/8. Path B (Normal) → Email by Zapier

Step-by-Step Breakdown
Step 1 — Trigger: Webhooks by Zapier (Catch Hook)
Catches incoming review submissions via a webhook URL. Tested using curl to POST sample review data (game title, platform, rating, headline, body, reviewer tag) directly to the webhook endpoint.
Step 2 — AI by Zapier (Classify)
Analyzes the review content and returns a structured classification including an Urgency field (Low / High), sentiment, content type, and custom tags. The AI is instructed via a custom prompt referencing live data fields from Step 1 (gameTitle, rating, headline, body).
Step 3 — Filter by Zapier (Error Guard — Part A)
This is the error-guarding step. The filter only allows the Zap to continue if the Urgency field from Step 2 is in either Low OR High. Any other/unexpected AI output (including errors or malformed responses) is blocked here, preventing bad data from reaching the notification steps. This also effectively filters out low-quality submissions that don't fit the expected classification pattern.
Tested with: Urgency: Low → "Your zap would have continued" ✅
Step 4 — Paths by Zapier (Conditional Logic — Part B)
Splits the workflow into two branches based on the classification result:

Path A — runs only if Urgency Contains High
Path B — runs only if Urgency Contains Low

Both paths were tested independently using the same sample data (Urgency: Low):

Path A correctly returned "Your path would not have continued" (correctly rejected, since this review was Low urgency, not High)
Path B correctly returned "Your path would have continued" (correctly matched)

This confirms the branching logic correctly routes different review types to different outcomes.
Steps 5/6 — Path A: Urgent Review Alert
When a review is classified as High urgency, an email is sent immediately via Email by Zapier with the subject line 🚨 Urgent Game Review Alert [gameTitle] and a body containing the full review details (game, rating, headline, body, reviewer) pulled live from Step 1.
Steps 7/8 — Path B: Normal Review Logged (Multi-Step Value-Add — Part C)
When a review is classified as Low urgency (normal), a formatted confirmation email is sent via Email by Zapier with the subject line ✓ Normal Review Received [gameTitle] and a body containing the review details plus an explicit Classification: Normal label.

Test Results Summary
StepTest InputResult1. WebhookSample review (curl POST)✅ Data received2. AI ClassifyElden Ring review, rating 10✅ Urgency: Low returned3. FilterUrgency: Low✅ "Your zap would have continued"5. Path A conditionUrgency: Low (testing against High rule)✅ Correctly rejected6. Path A action(configured, tested independently)✅ Email sent successfully7. Path B conditionUrgency: Low✅ "Your path would have continued"8. Path B actionUrgency: Low review✅ Email sent successfully, all fields populated
Both test emails were received in the connected Gmail inbox, confirming the full pipeline from webhook trigger through final notification works end to end.

Level Achieved: Level 3
✅ Part A — Error guarding: Filter step blocks any Urgency value that isn't explicitly "Low" or "High," preventing malformed AI output or unexpected content from reaching downstream notification steps.
✅ Part B — Conditional logic via Paths: Two fully built and independently tested paths branch based on the AI's urgency classification, each triggering a different notification.
✅ Part C — Multi-step value-add: The AI classification step itself adds significant value beyond simple keyword matching (sentiment, content type, custom tags), and each path produces a distinct, formatted, multi-field email — not just a single notification.
Total steps: 8 (exceeds the 6-step minimum for Level 3)

Project Context
This Zap was built using Gamers' Feedback (a personal portfolio project — a game review platform with AI-powered content moderation) as the use case, rather than a generic example. The classification logic mirrors the same helpful / spam / toxic moderation system built into the Gamers' Feedback web application itself (see /api/classify route), demonstrating the same AI moderation pattern implemented two different ways: natively in the Next.js app, and externally via no-code automation in Zapier.
