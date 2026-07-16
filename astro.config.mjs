// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // TODO: switch to a custom domain later — update `site` and drop `base` when that happens
  site: 'https://noonggop01.github.io',
  base: '/ai-pickle',
  integrations: [sitemap()]
});