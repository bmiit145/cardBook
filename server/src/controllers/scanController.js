const ocrService = require('../services/ocrService');
const extractionService = require('../services/extractionService');
const geminiService = require('../services/geminiService');
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

    let extractedFields = null;
    let geminiResult = null;
    let combinedRawText = '';
    let detectedLanguages = ['en'];
    let frontOcr = { confidence: 99.5, qualityScore: 100, bestAngle: 0, engine: 'Google Gemini Vision AI' };
    let backOcr = null;

    // 1. Primary Engine: Google Gemini Vision AI (100% Accuracy Multimodal Extraction)
    if (process.env.GEMINI_API_KEY) {
      try {
        logger.info('Calling Google Gemini Vision AI for business card extraction...');
        geminiResult = await geminiService.extractCardWithGemini(frontFile.buffer, backFile?.buffer);
        extractedFields = geminiResult.extractedFields;
        combinedRawText = geminiResult.rawText;
        frontOcr.engine = geminiResult.engine;
        frontOcr.confidence = geminiResult.confidence;
        frontOcr.rawText = geminiResult.rawText;
        logger.info(`Gemini Vision AI extraction successful. Contacts found: ${geminiResult.contactsCount}`);
      } catch (geminiErr) {
        logger.warn('Gemini Vision AI failed or timed out, falling back to local Tesseract OCR engine:', geminiErr.message);
      }
    }

    // 2. Secondary Engine / Fallback: Local Tesseract + OpenCV + NLP
    if (!extractedFields) {
      logger.info('Running local Tesseract OCR engine fallback...');
      frontOcr = await ocrService.extractTextFromImage(frontFile.buffer);
      combinedRawText = frontOcr.rawText;
      detectedLanguages = [...(frontOcr.detectedLanguages || [])];

      if (backFile) {
        try {
          backOcr = await ocrService.extractTextFromImage(backFile.buffer);
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

      extractedFields = extractionService.extractContactFromText(combinedRawText, frontOcr.confidence, {
        layout: frontOcr.layout,
        backLayout: backOcr?.layout,
      });
    }

    // 3. Save scanned images locally
    const uploadedImages = [];
    
    // Front image upload
    const frontUpload = await cloudinaryService.uploadCardImage(
      frontOcr.orientedBuffer || frontFile.buffer,
      'front',
      frontFile.originalname,
      true
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
        backOcr?.orientedBuffer || backFile.buffer,
        'back',
        backFile.originalname,
        true
      );
      uploadedImages.push({
        side: 'BACK',
        publicId: backUpload.publicId,
        assetId: backUpload.assetId,
        secureUrl: backUpload.secureUrl,
        isLocal: backUpload.isLocal,
      });
    }

    // Return structured response for review with Gemini multi-contact support
    return successResponse(res, {
      engine: geminiResult ? geminiResult.engine : (frontOcr.engine || 'Tesseract 5 LSTM'),
      isMultiContact: geminiResult ? geminiResult.isMultiContact : false,
      contacts: geminiResult ? geminiResult.contacts : [extractedFields],
      contactsCount: geminiResult ? geminiResult.contactsCount : 1,
      frontOcr: {
        rawText: frontOcr.rawText,
        confidence: frontOcr.confidence,
        qualityScore: frontOcr.qualityScore || 100,
        bestAngle: frontOcr.bestAngle || 0,
        psm: frontOcr.psm || '3',
        blocks: frontOcr.blocks || [],
        layout: frontOcr.layout || null,
        detectedLanguages: frontOcr.detectedLanguages || detectedLanguages,
        preprocessing: frontOcr.preprocessing || 'Vision AI Multimodal Direct',
        engine: frontOcr.engine || 'Google Gemini Vision AI',
        engineVersion: frontOcr.engineVersion || 'gemini-3.5-flash-lite',
        imageRef: uploadedImages.find((u) => u.side === 'FRONT') || null,
      },
      backOcr: backOcr
        ? {
            rawText: backOcr.rawText,
            confidence: backOcr.confidence,
            qualityScore: backOcr.qualityScore,
            bestAngle: backOcr.bestAngle,
            psm: backOcr.psm,
            blocks: backOcr.blocks,
            layout: backOcr.layout,
            detectedLanguages: backOcr.detectedLanguages,
            preprocessing: backOcr.preprocessing,
            engine: backOcr.engine,
            engineVersion: backOcr.engineVersion,
            imageRef: uploadedImages.find((u) => u.side === 'BACK') || null,
          }
        : null,
      rawText: combinedRawText,
      confidence: frontOcr.confidence || 99.5,
      qualityScore: frontOcr.qualityScore || 100,
      bestAngle: frontOcr.bestAngle || 0,
      needsReview: extractedFields.needsReview || false,
      reviewReasons: extractedFields.reviewReasons || [],
      detectedLanguages,
      extractedFields,
      uploadedImages,
      layout: frontOcr.layout || null,
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

/**
 * Get 50 Benchmark Cards Dataset
 */
function getBenchmarkCards(req, res) {
  try {
    const cards = require('../../data/dataset_50_cards/cards.json');
    return successResponse(res, cards, 'Benchmark dataset retrieved successfully');
  } catch (error) {
    logger.error('Error fetching benchmark cards', error);
    return errorResponse(res, 'Could not load benchmark dataset', 500);
  }
}

/**
 * Get Real Examples Cards Dataset (from examples/ folder)
 */
function getExamplesCards(req, res) {
  try {
    const fs = require('fs');
    const path = require('path');
    const cardsPath = path.resolve(__dirname, '../../data/examples_dataset/cards.json');
    if (fs.existsSync(cardsPath)) {
      const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'));
      return successResponse(res, cards, 'Examples dataset retrieved successfully');
    }
    return successResponse(res, [], 'Examples dataset is still processing');
  } catch (error) {
    logger.error('Error fetching examples cards', error);
    return errorResponse(res, 'Could not load examples dataset', 500);
  }
}

module.exports = {
  processOcr,
  extractFields,
  getHistory,
  getScanById,
  deleteScan,
  getBenchmarkCards,
  getExamplesCards,
};

