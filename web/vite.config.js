import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { env } from 'node:process'

const repository = env.GITHUB_REPOSITORY?.split('/')?.[1]

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: repository ? `/${repository}/` : '/',
})
