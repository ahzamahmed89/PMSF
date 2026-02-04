import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Ensure upload directory exists
const uploadDir = 'C:/Users/HomePC/Desktop/Images'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname)
    const activityCode = req.body.activityCode || '0'
    const branchCodeRaw = req.body.branchCode || ''
    const branchDigits = String(branchCodeRaw).replace(/\D/g, '') || '0'
    const visitYear = String(req.body.visitYear || new Date().getFullYear())
    const visitQuarter = String(req.body.visitQuarter || Math.ceil((new Date().getMonth() + 1) / 3))

    if (!req._imageCounts) req._imageCounts = {}
    if (!req._videoCounts) req._videoCounts = {}

    let sequence = 1
    if (file.mimetype.startsWith('image/')) {
      const currentCount = (req._imageCounts[activityCode] || 0) + 1
      req._imageCounts[activityCode] = currentCount
      sequence = currentCount
    } else if (file.mimetype.startsWith('video/')) {
      const currentCount = (req._videoCounts[activityCode] || 0) + 1
      req._videoCounts[activityCode] = currentCount
      sequence = 3 + currentCount
    }

    const filename = `${branchDigits}${visitQuarter}${visitYear}${activityCode}${sequence}${fileExt}`
    cb(null, filename)
  }
})

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'video/quicktime']
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only image and video files are allowed'), false)
  }
}

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
})
