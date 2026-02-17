import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import os from 'os'

// Get local IP for proxy configuration
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

export default defineConfig({
  plugins: [basicSsl()],
  define: {
    'process.env': {}
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment'
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx'
      }
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    https: true,
    proxy: {
      '/api': {
        target: `http://${localIP}:5000`,
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
