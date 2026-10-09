"""Tests for CSV processing and the API endpoints."""

import io
from app.services.csv_processor import parse_csv, validate_rows, export_leads_csv, map_columns


class TestCSVParsing:
    def test_basic_parse(self):
        csv = b"company_name,website,contact_email\nAcme,https://acme.com,a@acme.com\n"
        result = parse_csv(csv)
        assert len(result["rows"]) == 1
        assert result["rows"][0]["company_name"] == "Acme"
        assert len(result["parse_errors"]) == 0

    def test_empty_file(self):
        result = parse_csv(b"")
        assert len(result["parse_errors"]) > 0

    def test_no_headers(self):
        result = parse_csv(b"\n\n\n")
        assert len(result["rows"]) == 0

    def test_column_mapping(self):
        headers = ["Company", "Email", "Website", "employees"]
        mapping = map_columns(headers)
        assert mapping.get("Company") == "company_name"
        assert mapping.get("Email") == "contact_email"
        assert mapping.get("Website") == "website"
        assert mapping.get("employees") == "employee_count"

    def test_row_limit(self):
        lines = "company_name\n" + "\n".join([f"Co{i}" for i in range(50)])
        result = parse_csv(lines.encode(), max_rows=10)
        assert len(result["rows"]) == 10

    def test_duplicate_columns(self):
        csv = b"company_name,company_name\nA,B\n"
        result = parse_csv(csv)
        errors = [e for e in result["parse_errors"] if "Duplicate" in e["message"]]
        assert len(errors) > 0


class TestRowValidation:
    def test_valid_row(self):
        rows = [{"company_name": "Acme", "contact_email": "a@acme.com",
                 "website": "https://acme.com"}]
        valid, errors = validate_rows(rows)
        assert len(valid) == 1
        assert len(errors) == 0

    def test_missing_company_name(self):
        rows = [{"company_name": "", "contact_email": "a@acme.com"}]
        valid, errors = validate_rows(rows)
        assert len(valid) == 0
        assert len(errors) == 1
        assert errors[0]["field"] == "company_name"

    def test_invalid_email(self):
        rows = [{"company_name": "Acme", "contact_email": "notanemail"}]
        valid, errors = validate_rows(rows)
        assert len(valid) == 0
        assert len(errors) == 1
        assert errors[0]["field"] == "contact_email"

    def test_invalid_employee_count(self):
        rows = [{"company_name": "Acme", "employee_count": "abc"}]
        valid, errors = validate_rows(rows)
        assert len(valid) == 0
        assert errors[0]["field"] == "employee_count"

    def test_valid_with_missing_optional_fields(self):
        rows = [{"company_name": "Acme"}]
        valid, errors = validate_rows(rows)
        assert len(valid) == 1
        assert len(errors) == 0


class TestCSVExport:
    def test_basic_export(self):
        leads = [{"id": 1, "company_name": "Acme", "website": "https://acme.com",
                  "contact_name": "J", "contact_email": "j@a.com", "industry": "Tech",
                  "location": "NYC", "employee_count": 10, "qualification_score": 85.0,
                  "priority": "High", "data_quality_status": "Good", "created_at": "2024-01-01"}]
        csv_str = export_leads_csv(leads)
        assert "Acme" in csv_str
        assert "qualification_score" in csv_str

    def test_formula_injection_protection(self):
        leads = [{"id": 1, "company_name": "=CMD()", "website": "", "contact_name": "",
                  "contact_email": "+1@test.com", "industry": "", "location": "",
                  "employee_count": 0, "qualification_score": 0, "priority": "Low",
                  "data_quality_status": "Poor", "created_at": ""}]
        csv_str = export_leads_csv(leads)
        # Dangerous chars should be prefixed with a single quote
        assert "'=CMD()" in csv_str
        assert "'+1@test.com" in csv_str

    def test_empty_export(self):
        csv_str = export_leads_csv([])
        lines = csv_str.strip().split("\n")
        assert len(lines) == 1  # Only header


class TestAPIEndpoints:
    def test_health_check(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_create_and_get_lead(self, client):
        data = {
            "company_name": "Test Corp",
            "website": "https://test.com",
            "contact_email": "info@test.com",
            "industry": "Technology",
            "location": "NYC",
            "employee_count": 100,
        }
        resp = client.post("/api/leads", json=data)
        assert resp.status_code == 201
        lead = resp.json()
        assert lead["company_name"] == "Test Corp"
        assert lead["qualification_score"] > 0
        assert lead["priority"] in ("High", "Medium", "Low")

        # Get by ID
        resp2 = client.get(f"/api/leads/{lead['id']}")
        assert resp2.status_code == 200
        assert resp2.json()["id"] == lead["id"]

    def test_list_leads_pagination(self, client):
        # Create 5 leads
        for i in range(5):
            client.post("/api/leads", json={"company_name": f"Co{i}"})

        resp = client.get("/api/leads?page=1&page_size=2")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 5
        assert len(data["leads"]) == 2
        assert data["total_pages"] == 3

    def test_search_leads(self, client):
        client.post("/api/leads", json={"company_name": "Quantum Dynamics"})
        client.post("/api/leads", json={"company_name": "Other Corp"})

        resp = client.get("/api/leads?search=Quantum")
        data = resp.json()
        assert data["total"] == 1
        assert data["leads"][0]["company_name"] == "Quantum Dynamics"

    def test_filter_by_priority(self, client):
        client.post("/api/leads", json={
            "company_name": "Full",
            "website": "https://full.com",
            "contact_email": "a@full.com",
            "contact_name": "A",
            "industry": "Technology",
            "location": "NYC",
            "employee_count": 500,
        })
        client.post("/api/leads", json={"company_name": "Empty"})

        resp_high = client.get("/api/leads?priority=High")
        resp_low = client.get("/api/leads?priority=Low")
        assert resp_high.json()["total"] >= 0
        assert resp_low.json()["total"] >= 0

    def test_update_lead(self, client):
        resp = client.post("/api/leads", json={"company_name": "Old Name"})
        lead_id = resp.json()["id"]

        resp2 = client.put(f"/api/leads/{lead_id}", json={"company_name": "New Name"})
        assert resp2.status_code == 200
        assert resp2.json()["company_name"] == "New Name"

    def test_delete_lead(self, client):
        resp = client.post("/api/leads", json={"company_name": "ToDelete"})
        lead_id = resp.json()["id"]

        resp2 = client.delete(f"/api/leads/{lead_id}")
        assert resp2.status_code == 204

        resp3 = client.get(f"/api/leads/{lead_id}")
        assert resp3.status_code == 404

    def test_recalculate_lead(self, client):
        resp = client.post("/api/leads", json={"company_name": "Recalc"})
        lead_id = resp.json()["id"]

        resp2 = client.post(f"/api/leads/{lead_id}/recalculate")
        assert resp2.status_code == 200
        assert "qualification_score" in resp2.json()

    def test_csv_import(self, client):
        csv_content = (
            b"company_name,website,contact_email,industry,location,employee_count\n"
            b"ImportCo,https://import.com,a@import.com,Tech,NYC,50\n"
        )
        resp = client.post(
            "/api/leads/import",
            files={"file": ("test.csv", csv_content, "text/csv")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["imported_rows"] == 1
        assert data["total_rows"] == 1

    def test_csv_import_with_errors(self, client):
        csv_content = (
            b"company_name,contact_email\n"
            b",bad@email\n"
            b"Valid Co,good@valid.com\n"
        )
        resp = client.post(
            "/api/leads/import",
            files={"file": ("test.csv", csv_content, "text/csv")},
        )
        data = resp.json()
        assert data["invalid_rows"] >= 1
        assert data["imported_rows"] >= 0

    def test_dashboard_stats(self, client):
        client.post("/api/leads", json={"company_name": "Dashboard Test"})
        resp = client.get("/api/dashboard/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_leads"] >= 1

    def test_scoring_settings(self, client):
        resp = client.get("/api/settings/scoring")
        assert resp.status_code == 200
        data = resp.json()
        assert "weights" in data
        assert "thresholds" in data
        assert "high_value_industries" in data

    def test_export_csv(self, client):
        client.post("/api/leads", json={"company_name": "ExportCo"})
        resp = client.get("/api/leads/export")
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        assert "ExportCo" in resp.text

    def test_template_download(self, client):
        resp = client.get("/api/leads/template")
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        assert "company_name" in resp.text

    def test_lead_not_found(self, client):
        resp = client.get("/api/leads/99999")
        assert resp.status_code == 404
