"""Tests for the validation module."""

from app.services.validation import (
    is_valid_email,
    normalize_email,
    normalize_url,
    extract_domain,
    is_valid_url,
    normalize_company_name,
)


class TestEmailValidation:
    def test_valid_emails(self):
        assert is_valid_email("user@example.com")
        assert is_valid_email("user.name@example.co.uk")
        assert is_valid_email("user+tag@example.com")

    def test_invalid_emails(self):
        assert not is_valid_email("")
        assert not is_valid_email(None)
        assert not is_valid_email("notanemail")
        assert not is_valid_email("@example.com")
        assert not is_valid_email("user@")
        assert not is_valid_email("user@.com")
        assert not is_valid_email("bademaildotcom")

    def test_normalize_email(self):
        assert normalize_email("User@Example.COM") == "user@example.com"
        assert normalize_email("  user@test.com  ") == "user@test.com"
        assert normalize_email(None) is None
        assert normalize_email("") is None


class TestUrlValidation:
    def test_valid_urls(self):
        assert is_valid_url("https://example.com")
        assert is_valid_url("http://www.example.com")
        assert is_valid_url("example.com")

    def test_invalid_urls(self):
        assert not is_valid_url("")
        assert not is_valid_url(None)
        assert not is_valid_url("notaurl")

    def test_normalize_url(self):
        assert normalize_url("example.com") == "https://example.com"
        assert normalize_url("https://example.com") == "https://example.com"
        assert normalize_url(None) is None
        assert normalize_url("") is None

    def test_extract_domain(self):
        assert extract_domain("https://www.example.com/page") == "example.com"
        assert extract_domain("http://example.com") == "example.com"
        assert extract_domain("www.example.com") == "example.com"
        assert extract_domain(None) is None
        assert extract_domain("") is None


class TestCompanyNameNormalization:
    def test_basic_normalization(self):
        assert normalize_company_name("Acme Corp.") == "acme"
        assert normalize_company_name("Acme Inc.") == "acme"
        assert normalize_company_name("Acme LLC") == "acme"

    def test_strips_whitespace_and_punctuation(self):
        assert normalize_company_name("  Acme Corp  ") == "acme"
        assert normalize_company_name("Acme, Inc.") == "acme"

    def test_none_and_empty(self):
        assert normalize_company_name(None) is None
        assert normalize_company_name("") is None

    def test_preserves_meaningful_words(self):
        name = normalize_company_name("Quantum Dynamics Technologies")
        assert "quantum" in name
        assert "dynamics" in name
        assert "technologies" in name
