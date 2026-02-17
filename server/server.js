import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { initializePool } from './config/database.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: false
}))
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
    
    // Get the local IP address for network access
    const os = await import('os');
    const interfaces = os.networkInterfaces();
    let localIP = 'localhost';
    
    // Find the first non-internal IPv4 address
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIP = iface.address;
          break;
        }
      }
      if (localIP !== 'localhost') break;
    }
    
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Network access: http://${localIP}:${PORT}`);
      console.log(`✓ API endpoints at: http://${localIP}:${PORT}/api`);
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
