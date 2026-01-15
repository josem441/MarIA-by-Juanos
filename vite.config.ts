import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Esto asegura que process.env.API_KEY funcione si alguna librería antigua lo usa
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    }
  }
})