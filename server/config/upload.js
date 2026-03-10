import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// Upload directory
const UPLOAD_DIR = 'C:\\Users\\HomePC\\Desktop\\Images';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Create unique filename: activitycode_timestamp_ext
    const activityCode = req.body.activityCode || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${activityCode}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'));
  }
};

// Create multer upload instance
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: fileFilter
});

const QUIZ_MATERIALS_DIR = path.join(PROJECT_ROOT, 'uploads', 'quiz-materials');

if (!fs.existsSync(QUIZ_MATERIALS_DIR)) {
  fs.mkdirSync(QUIZ_MATERIALS_DIR, { recursive: true });
}

const quizMaterialStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, QUIZ_MATERIALS_DIR);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const safeBaseName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${safeBaseName}_${timestamp}${ext}`);
  }
});

const quizMaterialFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    return cb(null, true);
  }

  cb(new Error('Only PDF, Word, and PowerPoint files are allowed.'));
};

export const quizMaterialUpload = multer({
  storage: quizMaterialStorage,
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  fileFilter: quizMaterialFilter
});

export const QUIZ_MATERIALS_PUBLIC_BASE = '/uploads/quiz-materials';
