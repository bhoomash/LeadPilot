"""Tests for the scoring engine."""

from app.services.scoring import calculate_score, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS


class TestScoring:
    def test_complete_lead_high_score(self):
        """A fully-filled lead in a high-value industry should score high."""
        lead = {
            "company_name": "TechCorp",
            "website": "https://techcorp.com",
            "contact_name": "John Doe",
            "contact_email": "john@techcorp.com",
            "industry": "Technology",
            "location": "San Francisco",
            "employee_count": 500,
        }
        result = calculate_score(lead)
        assert result["score"] >= 70
        assert result["priority"] == "High"
        assert result["data_quality_status"] == "Good"
        assert len(result["breakdown"]) == 8

    def test_empty_lead_low_score(self):
        """A lead with only a company name should score low."""
        lead = {"company_name": "Unknown Co"}
        result = calculate_score(lead)
        assert result["score"] < 40
        assert result["priority"] == "Low"

    def test_medium_priority(self):
        """A lead with some fields should be Medium."""
        lead = {
            "company_name": "SomeCo",
            "website": "https://someco.com",
            "contact_email": "info@someco.com",
            "industry": "Consulting",
        }
        result = calculate_score(lead)
        assert result["score"] >= 40
        assert result["priority"] in ("Medium", "High")

    def test_breakdown_sums_to_score(self):
        lead = {
            "company_name": "Test",
            "website": "https://test.com",
            "contact_email": "a@test.com",
            "industry": "SaaS",
            "location": "NYC",
            "employee_count": 100,
            "contact_name": "Bob",
        }
        result = calculate_score(lead)
        breakdown_total = sum(item["score"] for item in result["breakdown"])
        assert abs(breakdown_total - result["score"]) < 0.1

    def test_custom_weights(self):
        lead = {"company_name": "WeightTest", "website": "https://wt.com"}
        custom_weights = {**DEFAULT_WEIGHTS, "has_website": 50}
        result = calculate_score(lead, weights=custom_weights)
        # Website factor should now be worth 50 points
        website_item = next(
            i for i in result["breakdown"] if i["factor"] == "has_website"
        )
        assert website_item["score"] == 50

    def test_custom_thresholds(self):
        lead = {"company_name": "ThreshTest", "website": "https://tt.com"}
        # Set high threshold very low so this becomes High priority
        result = calculate_score(
            lead, thresholds={"high": 10, "medium": 5}
        )
        assert result["priority"] == "High"

    def test_high_value_industry_bonus(self):
        lead_tech = {
            "company_name": "A", "industry": "Technology",
        }
        lead_other = {
            "company_name": "A", "industry": "Agriculture",
        }
        score_tech = calculate_score(lead_tech)["score"]
        score_other = calculate_score(lead_other)["score"]
        assert score_tech > score_other

    def test_employee_count_tiers(self):
        small = calculate_score({"company_name": "A", "employee_count": 5})
        large = calculate_score({"company_name": "A", "employee_count": 5000})
        assert large["score"] > small["score"]

    def test_deterministic(self):
        lead = {"company_name": "Det", "website": "https://det.com"}
        r1 = calculate_score(lead)
        r2 = calculate_score(lead)
        assert r1["score"] == r2["score"]

    def test_missing_data_not_penalized_beyond_zero(self):
        """Missing fields get 0, not negative scores."""
        lead = {"company_name": "Minimal"}
        result = calculate_score(lead)
        assert result["score"] >= 0
        for item in result["breakdown"]:
            assert item["score"] >= 0
