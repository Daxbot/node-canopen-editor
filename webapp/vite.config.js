import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Set base to '/node-canopen-editor/' for GitHub Pages deployment.
// Override with VITE_BASE env var if hosting at a different path.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? './',
  optimizeDeps: {
    include: ['canopen-eds', 'canopen-xdd'],
  },
})
