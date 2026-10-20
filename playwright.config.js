import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://127.0.0.1:8080', viewport: { width: 1440, height: 900 } },
  webServer: { command: 'python3 -m http.server 8080 --bind 127.0.0.1', url: 'http://127.0.0.1:8080/app/index.html', reuseExistingServer: true },
});
