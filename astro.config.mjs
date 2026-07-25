import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.lodgedwell.com.au',
  // Static output — deploys to Netlify/Vercel/any static host.
  output: 'static',
  compressHTML: true,
  // Old Tally purchase-flow URLs (three-step form with SMS/email verification,
  // now replaced by a single Jotform with built-in email verification).
  redirects: {
    '/purchase-verify': '/get-started',
    '/purchase-details': '/get-started',
    '/purchase-flow/step-1': '/get-started',
    '/purchase-flow/step-2': '/get-started',
    '/purchase-flow/step-3': '/get-started',
  },
});
