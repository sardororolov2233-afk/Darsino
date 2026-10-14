import { defineConfig } from "@playwright/test";
const externalServer = process.env.DARSINO_TEST_BASE_URL;
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: externalServer || "http://127.0.0.1:8081",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: ["--no-sandbox"],
    },
  },
  webServer: externalServer
    ? undefined
    : {
        command: "npx expo start --web --port 8081",
        url: "http://127.0.0.1:8081",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        env: {
          BROWSER: "none",
          EXPO_PUBLIC_BACKEND_MODE: "demo",
          EXPO_UNSTABLE_HEADLESS: "1",
          EXPO_NO_DEPENDENCY_VALIDATION: "0",
          EXPO_NO_TELEMETRY: "1",
        },
      },
});
