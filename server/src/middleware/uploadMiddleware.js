const multer = require('multer');

// Memory storage allows direct passing of buffer into Sharp and Cloudinary uploader streams
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 12 * 1024 * 1024, // 12 MB max
  },
  fileFilter,
});

// Middleware for OCR endpoint (can accept single front or front+back)
const scanUpload = upload.fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 },
  { name: 'image', maxCount: 1 }, // generic single file fallback
]);

module.exports = {
  scanUpload,
  upload,
};

