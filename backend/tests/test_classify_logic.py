"""
Tests for the pure classify_by_rules() function.
Mirrors the Jest tests in src/__tests__/lib/classify.test.ts so both
layers enforce the same contract.
"""
from backend.classify import classify_by_rules


class TestSpam:
    def test_detects_discount(self):
        result = classify_by_rules("Use this discount at checkout")
        assert result["classification"] == "spam"

    def test_detects_giveaway(self):
        result = classify_by_rules("Huge giveaway click here to enter")
        assert result["classification"] == "spam"

    def test_detects_free_vbucks(self):
        result = classify_by_rules("Get free v-bucks with this trick")
        assert result["classification"] == "spam"

    def test_detects_link_in_bio(self):
        result = classify_by_rules("More info at link in bio subscribe now")
        assert result["classification"] == "spam"

    def test_case_insensitive(self):
        result = classify_by_rules("HUGE DISCOUNT CODE AVAILABLE NOW")
        assert result["classification"] == "spam"

    def test_word_code_alone_is_not_spam(self):
        """'code' was a false positive in the original keyword list."""
        result = classify_by_rules("The game code is full of bugs and crashes")
        assert result["classification"] == "helpful"

    def test_click_alone_is_not_spam(self):
        """'click' alone caused false positives on gameplay descriptions."""
        result = classify_by_rules("You click to attack and it feels responsive")
        assert result["classification"] == "helpful"

    def test_returns_reason_string(self):
        result = classify_by_rules("subscribe for a giveaway discount")
        assert result["reason"]


class TestToxic:
    def test_detects_devs_are_idiots(self):
        result = classify_by_rules("The devs are idiots who ruined this sequel")
        assert result["classification"] == "toxic"

    def test_detects_worst_game_ever(self):
        result = classify_by_rules("Honestly the worst game ever released")
        assert result["classification"] == "toxic"

    def test_detects_trash(self):
        result = classify_by_rules("This game is complete trash")
        assert result["classification"] == "toxic"

    def test_case_insensitive(self):
        result = classify_by_rules("GARBAGE GAME DO NOT BUY")
        assert result["classification"] == "toxic"


class TestHelpful:
    def test_genuine_positive_review(self):
        result = classify_by_rules(
            "Elden Ring is a masterpiece. Stunning open world, tight combat."
        )
        assert result["classification"] == "helpful"

    def test_genuine_critical_review(self):
        result = classify_by_rules(
            "Disappointing sequel. The story is weak and frame rate tanks on PC."
        )
        assert result["classification"] == "helpful"

    def test_empty_string_does_not_crash(self):
        result = classify_by_rules("")
        assert result["classification"] == "helpful"

    def test_cheat_codes_not_spam(self):
        result = classify_by_rules("The cheat codes in this game are fun to use")
        assert result["classification"] == "helpful"


class TestPriority:
    def test_spam_beats_toxic_when_both_present(self):
        result = classify_by_rules("Subscribe for a discount you idiots")
        assert result["classification"] == "spam"
