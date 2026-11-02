const ocrService = require('../services/ocrService');
const extractionService = require('../services/extractionService');
const cloudinaryService = require('../services/cloudinaryService');
const { getDb } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Upload Card and Perform OCR & Initial Extraction
 */
async function processOcr(req, res) {
  try {
    const files = req.files;
    const frontFile = files?.frontImage?.[0] || files?.image?.[0];
    const backFile = files?.backImage?.[0];

    if (!frontFile) {
      return errorResponse(res, 'Please provide at least a front business card image.', 400);
    }

    logger.info(`Processing card scan. Front image size: ${frontFile.size} bytes. Double-sided: ${Boolean(backFile)}`);

    // 1. Run OCR on Front Image
    const frontOcr = await ocrService.extractTextFromImage(frontFile.buffer);
    let combinedRawText = frontOcr.rawText;
    let detectedLanguages = [...(frontOcr.detectedLanguages || [])];

    // 2. If Back Image exists, run OCR on it as well
    if (backFile) {
      try {
        const backOcr = await ocrService.extractTextFromImage(backFile.buffer);
        if (backOcr.rawText) {
          combinedRawText += `\n--- BACK SIDE ---\n${backOcr.rawText}`;
        }
        if (backOcr.detectedLanguages) {
          backOcr.detectedLanguages.forEach((lang) => {
            if (!detectedLanguages.includes(lang)) detectedLanguages.push(lang);
          });
        }
      } catch (backErr) {
        logger.warn('Failed OCR on back side image, proceeding with front side only', backErr);
      }
    }

    // 3. Extract structured contact fields from the combined raw OCR text
    const extractedFields = extractionService.extractContactFromText(combinedRawText);

    // 4. Upload images to Cloudinary (or fallback store)
    const uploadedImages = [];
    
    // Front image upload
    const frontUpload = await cloudinaryService.uploadCardImage(
      frontFile.buffer,
      'front',
      frontFile.originalname
    );
    uploadedImages.push({
      side: 'FRONT',
      publicId: frontUpload.publicId,
      assetId: frontUpload.assetId,
      secureUrl: frontUpload.secureUrl,
      isLocal: frontUpload.isLocal,
    });

    // Back image upload if present
    if (backFile) {
      const backUpload = await cloudinaryService.uploadCardImage(
        backFile.buffer,
        'back',
        backFile.originalname
      );
      uploadedImages.push({
        side: 'BACK',
        publicId: backUpload.publicId,
        assetId: backUpload.assetId,
        secureUrl: backUpload.secureUrl,
        isLocal: backUpload.isLocal,
      });
    }

    // Return structured response for admin review
    return successResponse(res, {
      rawText: combinedRawText,
      detectedLanguages,
      extractedFields,
      uploadedImages,
      isDoubleSided: Boolean(backFile),
    }, 'Business card scanned and text extracted successfully');
  } catch (error) {
    logger.error('Error processing card OCR', error);
    return errorResponse(res, `Failed to process card: ${error.message}`, 500);
  }
}

/**
 * Re-extract or Parse Structured Fields from Raw Text
 */
async function extractFields(req, res) {
  try {
    const { rawText } = req.body;
    if (!rawText) {
      return errorResponse(res, 'rawText is required', 400);
    }
    const extractedFields = extractionService.extractContactFromText(rawText);
    return successResponse(res, { extractedFields }, 'Contact fields extracted successfully');
  } catch (error) {
    logger.error('Error re-extracting fields', error);
    return errorResponse(res, 'Failed to extract fields', 500);
  }
}

/**
 * Get Scan History
 */
async function getHistory(req, res) {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit, 10) || 20;

    const history = await db.scanHistory.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return successResponse(res, { history });
  } catch (error) {
    logger.error('Error fetching scan history', error);
    return errorResponse(res, 'Failed to fetch scan history', 500);
  }
}

/**
 * Get Single Scan Record
 */
async function getScanById(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const scan = await db.scanHistory.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!scan) {
      return errorResponse(res, 'Scan record not found', 404);
    }

    return successResponse(res, { scan });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch scan details', 500);
  }
}

/**
 * Delete Scan Record
 */
async function deleteScan(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    await db.scanHistory.delete({
      where: { id },
    });

    return successResponse(res, {}, 'Scan history record deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete scan record', 500);
  }
}

module.exports = {
  processOcr,
  extractFields,
  getHistory,
  getScanById,
  deleteScan,
};

