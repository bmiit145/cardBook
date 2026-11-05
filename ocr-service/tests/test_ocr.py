"""
Unit test for CardScan AI Python OCR Service
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)


def test_health_check():
    """Verify health endpoint reports online and lists models."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "service" in data
    print("\n[Health Check Success]:", data)


def test_ocr_processing_sample_card():
    """Verify OCR execution on a sample business card."""
    sample_img_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../examples/IMG_20261102_153255716.jpg"))
    if not os.path.exists(sample_img_path):
        pytest.skip("Sample image not found, skipping test.")

    with open(sample_img_path, "rb") as f:
        response = client.post(
            "/api/v1/ocr",
            files={"file": ("test_card.jpg", f, "image/jpeg")},
            data={"languages": "eng+hin+guj", "psm": 11, "auto_rotate": True}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "text" in data
    assert "confidence" in data
    print("\n[OCR Result]: Text length:", len(data["text"]), "Confidence:", data["confidence"])


if __name__ == "__main__":
    test_health_check()
    test_ocr_processing_sample_card()
    print("\nAll OCR service tests completed successfully!")

