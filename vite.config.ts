import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// bmx — front Vue 3 + Vite.
// `base: './'` → chemins relatifs : marche à la racine comme sous un
// sous-chemin (ex. /BMX/). L'URL de l'API est surchargeable au build via
// la variable d'environnement VITE_BMX_API_URL (sinon fallback dans api.ts).
export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
