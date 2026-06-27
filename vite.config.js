import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load GITHUB_TOKEN environment variable for client injection
const loadEnvToken = () => {
  const envPaths = [
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env')
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual !== -1) {
            const key = trimmed.slice(0, firstEqual).trim();
            const val = trimmed.slice(firstEqual + 1).trim();
            if (key === 'GITHUB_TOKEN') return val;
          }
        }
      }
    }
  }
  return '';
};

const token = loadEnvToken();

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.GITHUB_TOKEN': JSON.stringify(token || process.env.GITHUB_TOKEN || '')
  }
})
