const { uploadToCloudinary } = require('../middleware/upload');
const { success, error } = require('../utils/response');

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'No file provided', 400, 'VALIDATION_ERROR');

    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    return success(res, {
      url: result.secure_url,
      public_id: result.public_id,
      filename: req.file.originalname,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      width: result.width || null,
      height: result.height || null,
    }, 'File uploaded successfully');
  } catch (err) {
    if (err.message?.includes('not configured')) {
      return error(res, err.message, 503, 'SERVICE_UNAVAILABLE');
    }
    next(err);
  }
};
