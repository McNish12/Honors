import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const repoBase = '/Honors/'
const rootDir = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '')
  const defaultBase = mode === 'production' ? repoBase : '/'
  return {
    plugins: [react()],
    // Allow overriding the base path so the app works on GitHub Pages subpaths.
    base: env.VITE_APP_BASE || defaultBase,
  }
})
