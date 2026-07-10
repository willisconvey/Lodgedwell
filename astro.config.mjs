import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.lodgedwell.com.au',
  // Static output — deploys to Netlify/Vercel/any static host.
  output: 'static',
  compressHTML: true,
});
