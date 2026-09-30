import { defineConfig } from 'vite';
import vinext from 'vinext';

// The learning MVP uses browser storage and needs no Cloudflare bindings.
export default defineConfig({
  plugins: [vinext()],
  server: { host: '127.0.0.1', port: 4317, strictPort: true, watch: { usePolling: true } },
});
