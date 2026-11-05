"""
CardScan AI - Python OCR Microservice (FastAPI + OpenCV + Tesseract 5)
Provides high-performance multilingual OCR (English, Hindi, Gujarati) with contrast enhancement and auto-orientation.
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import time

from app.services.image_processor import (
    load_image_from_bytes,
    preprocess_for_ocr,
    rotate_image
)
from app.services.ocr_engine import (
    run_tesseract_ocr,
    get_installed_languages,
    tesseract_binary,
    DEFAULT_TESSDATA
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ocr_service")

app = FastAPI(
    title="CardScan AI - OCR Engine",
    description="Dedicated microservice for multilingual business card OCR and OpenCV preprocessing",
    version="1.0.0"
)

# Enable CORS for internal backend service calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Service health and Tesseract environment check."""
    langs = get_installed_languages()
    return {
        "status": "online",
        "service": "CardScan AI - Python OCR",
        "tesseract_binary": tesseract_binary or "in_path",
        "tessdata_path": DEFAULT_TESSDATA,
        "available_languages": langs,
        "required_models_present": all(lang in langs for lang in ["eng", "hin", "guj"]) if DEFAULT_TESSDATA else True
    }


@app.post("/api/v1/ocr")
async def process_ocr(
    file: UploadFile = File(...),
    languages: str = Form("eng+hin+guj"),
    psm: int = Form(11),
    auto_rotate: bool = Form(True),
    enhance: bool = Form(True)
):
    """
    Process business card image with OpenCV preprocessing and Tesseract 5 OCR.
    """
    start_time = time.time()
    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image file received.")

        # 1. Load image via OpenCV
        img = load_image_from_bytes(image_bytes)

        # 2. Preprocess with OpenCV (resize, CLAHE, polarity inversion, bilateral filter)
        preproc = preprocess_for_ocr(img, enhance_contrast=enhance)
        processed_img = preproc["processed_image"]

        best_result = None
        selected_angle = 0

        # 3. Orientation testing / OCR
        angles = [0, 90, 180, 270] if auto_rotate else [0]
        
        # Test 0 degrees first
        result_0 = run_tesseract_ocr(processed_img, languages=languages, psm=psm)
        best_result = result_0
        selected_angle = 0

        # If 0 degrees gives very low confidence and auto_rotate is on, test other orientations
        if auto_rotate and result_0["confidence"] < 60.0:
            for angle in [90, 180, 270]:
                rotated = rotate_image(processed_img, angle)
                res = run_tesseract_ocr(rotated, languages=languages, psm=psm)
                if res["confidence"] > best_result["confidence"]:
                    best_result = res
                    selected_angle = angle
                # If we get a strong reading, stop checking further angles
                if best_result["confidence"] > 75.0:
                    break

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "success": True,
            "text": best_result["text"],
            "confidence": best_result["confidence"],
            "selected_rotation": selected_angle,
            "was_inverted": preproc["was_inverted"],
            "psm": psm,
            "languages": languages,
            "word_count": best_result["word_count"],
            "lines": best_result["lines"],
            "words": best_result["words"],
            "processing_time_ms": elapsed_ms
        }

    except Exception as e:
        logger.error(f"Error during OCR processing: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR execution failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

