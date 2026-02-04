import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { initializePool } from './config/database.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Serve static images from the Images folder
app.use('/images', express.static('C:/Users/HomePC/Desktop/Images'))

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' })
})

// Import routes
import apiRoutes from './routes/api.js'
app.use('/api', apiRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

// Initialize database and start server
async function startServer() {
  try {
    await initializePool()
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
