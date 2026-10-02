const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:3100" },
  webServer: {
    command: "node scripts/e2e-server.cjs",
    url: "http://127.0.0.1:3100/healthz",
    reuseExistingServer: false,
  },
});
