"""
OpenCV Image Preprocessing Pipeline for Business Card OCR
Supports CLAHE contrast enhancement, polarity inversion, deskewing, and multi-angle orientation.
"""

import cv2
import numpy as np
from typing import Tuple, List, Dict, Any


def load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """Decode raw image bytes into a BGR OpenCV NumPy array."""
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image from provided bytes.")
    return img


def check_and_fix_polarity(gray: np.ndarray) -> Tuple[np.ndarray, bool]:
    """
    Detect if card has white/light text on dark background.
    If dark background, invert so Tesseract receives dark text on light background.
    """
    # Sample 4 outer border margins (top, bottom, left, right)
    h, w = gray.shape
    border_px = np.concatenate([
        gray[0:max(5, int(h * 0.05)), :].flatten(),
        gray[-max(5, int(h * 0.05)):, :].flatten(),
        gray[:, 0:max(5, int(w * 0.05))].flatten(),
        gray[:, -max(5, int(w * 0.05)):].flatten()
    ])
    median_border = float(np.median(border_px))
    
    # If border median is dark (< 115), card has dark background
    if median_border < 115:
        inverted = cv2.bitwise_not(gray)
        return inverted, True
    return gray, False


def apply_clahe(gray: np.ndarray, clip_limit: float = 2.5, tile_grid_size: Tuple[int, int] = (8, 8)) -> np.ndarray:
    """Apply Contrast Limited Adaptive Histogram Equalization (CLAHE)."""
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    return clahe.apply(gray)


def rotate_image(image: np.ndarray, angle: int) -> np.ndarray:
    """Rotate image by 0, 90, 180, or 270 degrees clockwise."""
    if angle == 90:
        return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    elif angle == 180:
        return cv2.rotate(image, cv2.ROTATE_180)
    elif angle == 270:
        return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return image


def preprocess_for_ocr(
    image: np.ndarray,
    target_dpi_width: int = 2000,
    enhance_contrast: bool = True
) -> Dict[str, Any]:
    """
    Complete business card enhancement pipeline:
    1. Resize for optimal OCR resolution (width ~2000px).
    2. Convert to grayscale.
    3. Detect and fix polarity (white text on dark background).
    4. Apply CLAHE contrast enhancement.
    5. Light bilateral filter to reduce paper texture/grain while preserving text edges.
    """
    h, w = image.shape[:2]
    
    # Scale if card image is too small or excessively large
    scale = 1.0
    if w < target_dpi_width:
        scale = target_dpi_width / float(w)
        new_w = target_dpi_width
        new_h = int(h * scale)
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    elif w > 3200:
        scale = 2400.0 / float(w)
        new_w = 2400
        new_h = int(h * scale)
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    else:
        resized = image.copy()

    # Grayscale
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

    # Polarity check & fix
    normalized_gray, was_inverted = check_and_fix_polarity(gray)

    # CLAHE contrast enhancement
    if enhance_contrast:
        enhanced = apply_clahe(normalized_gray, clip_limit=2.0, tile_grid_size=(8, 8))
    else:
        enhanced = normalized_gray

    # Subtle bilateral filter for sharp crisp text edges
    filtered = cv2.bilateralFilter(enhanced, d=5, sigmaColor=50, sigmaSpace=50)

    return {
        "processed_image": filtered,
        "original_resized": resized,
        "was_inverted": was_inverted,
        "scale": scale,
        "width": filtered.shape[1],
        "height": filtered.shape[0]
    }

