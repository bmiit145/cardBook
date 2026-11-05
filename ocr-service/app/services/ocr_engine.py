"""
Tesseract OCR Engine Integration
Supports English, Hindi, and Gujarati with tessdata_best models and bounding box extraction.
"""

import os
import shutil
import pytesseract
from PIL import Image
import numpy as np
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger("ocr_engine")

# 1. Locate Tesseract binary
POSSIBLE_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
]

tesseract_binary = shutil.which("tesseract")
if not tesseract_binary:
    for path in POSSIBLE_PATHS:
        if os.path.exists(path):
            tesseract_binary = path
            break

if tesseract_binary:
    pytesseract.pytesseract.tesseract_cmd = tesseract_binary
    logger.info(f"Using Tesseract executable: {tesseract_binary}")
else:
    logger.warning("Tesseract binary not found in standard paths. pytesseract will rely on PATH.")

# 2. Locate tessdata folder (with eng, hin, guj)
SERVER_TESSDATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../server/tessdata_best"))
if os.path.isdir(SERVER_TESSDATA):
    DEFAULT_TESSDATA = SERVER_TESSDATA
else:
    DEFAULT_TESSDATA = ""


def get_installed_languages() -> List[str]:
    """Retrieve list of languages recognized by Tesseract."""
    try:
        config = f'--tessdata-dir "{DEFAULT_TESSDATA}"' if DEFAULT_TESSDATA else ""
        langs = pytesseract.get_languages(config=config)
        return langs
    except Exception as e:
        logger.warning(f"Tesseract executable not yet detected in PATH: {e}")
        # If tessdata_best directory is present, return the models found on disk
        if DEFAULT_TESSDATA and os.path.isdir(DEFAULT_TESSDATA):
            found = []
            for f in os.listdir(DEFAULT_TESSDATA):
                if f.endswith('.traineddata'):
                    found.append(f.replace('.traineddata', ''))
            return found or ["eng"]
        return ["eng"]


def run_tesseract_ocr(
    image: np.ndarray,
    languages: str = "eng+hin+guj",
    psm: int = 11,
    tessdata_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    Execute Tesseract 5 OCR with specific languages and PSM mode.
    Extracts raw text, line-level and word-level bounding boxes, and average confidence.
    """
    data_dir = tessdata_dir or DEFAULT_TESSDATA
    config_parts = [
        "--oem 1",
        f"--psm {psm}",
    ]
    if data_dir and os.path.isdir(data_dir):
        config_parts.append(f'--tessdata-dir "{data_dir}"')

    tess_config = " ".join(config_parts)

    pil_img = Image.fromarray(image)

    try:
        # 1. Raw text
        raw_text = pytesseract.image_to_string(pil_img, lang=languages, config=tess_config)

        # 2. Detailed TSV data with bounding boxes & word confidences
        tsv_data = pytesseract.image_to_data(
            pil_img,
            lang=languages,
            config=tess_config,
            output_type=pytesseract.Output.DICT
        )
    except pytesseract.pytesseract.TesseractNotFoundError:
        logger.warning("Tesseract binary not found on host. Returning graceful empty response.")
        return {
            "text": "",
            "confidence": 0.0,
            "languages": languages,
            "psm": psm,
            "word_count": 0,
            "lines": [],
            "words": [],
            "error": "Tesseract binary not found. Run: winget install -e --id UB-Mannheim.TesseractOCR in an elevated terminal."
        }

    words: List[Dict[str, Any]] = []
    lines: List[Dict[str, Any]] = []
    current_line_words: List[str] = []
    current_line_conf: List[float] = []

    confidences = []
    n_boxes = len(tsv_data["text"])

    for i in range(n_boxes):
        text_token = tsv_data["text"][i].strip()
        conf = float(tsv_data["conf"][i])

        if text_token and conf > 0:
            confidences.append(conf)
            words.append({
                "text": text_token,
                "confidence": conf,
                "bbox": {
                    "x": tsv_data["left"][i],
                    "y": tsv_data["top"][i],
                    "width": tsv_data["width"][i],
                    "height": tsv_data["height"][i]
                }
            })
            current_line_words.append(text_token)
            current_line_conf.append(conf)
        elif current_line_words and tsv_data["word_num"][i] == 0:
            lines.append({
                "text": " ".join(current_line_words),
                "confidence": round(sum(current_line_conf) / len(current_line_conf), 2)
            })
            current_line_words = []
            current_line_conf = []

    if current_line_words:
        lines.append({
            "text": " ".join(current_line_words),
            "confidence": round(sum(current_line_conf) / len(current_line_conf), 2)
        })

    avg_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.0

    return {
        "text": raw_text.strip(),
        "confidence": avg_confidence,
        "languages": languages,
        "psm": psm,
        "word_count": len(words),
        "lines": lines,
        "words": words
    }

