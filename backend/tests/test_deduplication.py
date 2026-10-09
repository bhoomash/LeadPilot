"""Tests for deduplication logic."""

from app.services.deduplication import find_duplicates_in_batch


class TestBatchDeduplication:
    def test_no_duplicates(self):
        rows = [
            {"company_name": "A", "website": "https://a.com", "contact_email": "a@a.com"},
            {"company_name": "B", "website": "https://b.com", "contact_email": "b@b.com"},
        ]
        dupes = find_duplicates_in_batch(rows)
        assert len(dupes) == 0

    def test_duplicate_domain(self):
        rows = [
            {"company_name": "A", "website": "https://www.same.com", "contact_email": "a@a.com"},
            {"company_name": "B", "website": "https://same.com", "contact_email": "b@b.com"},
        ]
        dupes = find_duplicates_in_batch(rows)
        assert 1 in dupes
        assert "domain" in dupes[1].lower()

    def test_duplicate_email(self):
        rows = [
            {"company_name": "A", "website": "https://a.com", "contact_email": "same@test.com"},
            {"company_name": "B", "website": "https://b.com", "contact_email": "SAME@test.com"},
        ]
        dupes = find_duplicates_in_batch(rows)
        assert 1 in dupes
        assert "email" in dupes[1].lower()

    def test_duplicate_company_name(self):
        rows = [
            {"company_name": "Acme Corp.", "website": "https://a.com", "contact_email": "a@a.com"},
            {"company_name": "Acme Corp", "website": "https://b.com", "contact_email": "b@b.com"},
        ]
        dupes = find_duplicates_in_batch(rows)
        assert 1 in dupes
        assert "company" in dupes[1].lower()

    def test_first_occurrence_kept(self):
        rows = [
            {"company_name": "A", "website": "https://same.com"},
            {"company_name": "B", "website": "https://same.com"},
            {"company_name": "C", "website": "https://same.com"},
        ]
        dupes = find_duplicates_in_batch(rows)
        assert 0 not in dupes  # First occurrence kept
        assert 1 in dupes
        assert 2 in dupes

    def test_distinct_similar_names_not_flagged(self):
        """Companies with similar but distinct names should NOT be duplicates."""
        rows = [
            {"company_name": "Quantum Dynamics", "website": "https://qd.com"},
            {"company_name": "Quantum Solutions", "website": "https://qs.com"},
        ]
        dupes = find_duplicates_in_batch(rows)
        assert len(dupes) == 0
