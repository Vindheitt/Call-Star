import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Относительные пути работают и для GitHub Pages в репозитории, и для локального запуска.
  base: './',
});
