import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://example.com', // TODO: 本番ドメインが確定したら差し替える
  vite: {
    plugins: [tailwindcss()],
  },
});
