const { z } = require('zod');

const extractTextSchema = z.object({
  rawText: z.string().min(1, 'Raw OCR text is required for field extraction'),
});

module.exports = {
  extractTextSchema,
};

