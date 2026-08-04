import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://teate1122.netlify.app',
  vite: {
    plugins: [tailwindcss()],
  },
});
