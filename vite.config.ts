import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  resolve: {
    alias: {
      "@": "./src",
      "@app": "./src/app",
      "@pages": "./src/pages",
      "@widgets": "./src/widgets",
      "@features": "./src/features",
      "@entities": "./src/entities",
      "@shared": "./src/shared",
    },
  },
});
