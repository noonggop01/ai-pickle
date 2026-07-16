// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // TODO: replace with the real domain (or *.pages.dev / *.github.io URL) once hosting is connected
  site: 'https://example.com',
  integrations: [sitemap()]
});