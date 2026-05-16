const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const BLOCKED_TYPES = [
  'application/x-msdownload',
  'application/x-executable',
  'application/x-sh',
  'application/bat',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (BLOCKED_TYPES.includes(file.mimetype)) {
      return cb(new Error('File type not allowed'));
    }
    cb(null, true);
  },
});

async function uploadToCloudinary(buffer, originalname, mimetype) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('File upload not configured. Set CLOUDINARY_* environment variables.');
  }
  return new Promise((resolve, reject) => {
    const isImage = mimetype.startsWith('image/');
    const options = {
      folder: 'skyjobs',
      resource_type: 'auto',
      use_filename: false,
      unique_filename: true,
    };
    if (isImage) {
      options.transformation = [{ width: 1920, height: 1920, crop: 'limit', quality: 'auto:good' }];
    }
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
}

module.exports = { upload, uploadToCloudinary, cloudinary };
