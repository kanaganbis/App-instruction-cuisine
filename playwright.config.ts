import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: "retain-on-failure",
    locale: "fr-FR",
    // The tests answer the Google Drive calls themselves (e2e/drive-mock.ts);
    // a service worker would hide those calls from them.
    serviceWorkers: "block",
    launchOptions: {
      // Lets the suite run against a preinstalled Chromium when the matching
      // Playwright build is not downloaded (`npx playwright install chromium`).
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    },
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // The real single-file build, pointed at a fake Drive folder.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      VITE_GOOGLE_API_KEY: "cle-e2e",
      VITE_DRIVE_FOLDER: "https://drive.google.com/drive/folders/dossier-e2e",
    },
  },
});
