import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    globals: true,
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.test.toml" },
        miniflare: {
          kvNamespaces: ["SESSIONS", "RATE_LIMIT", "CACHE", "WEBHOOK_EVENTS"],
          r2Buckets: ["REPORTS"],
          d1Databases: ["DB", "BAFA_DB", "BAFA_CONTENT"],
          bindings: {
            JWT_SECRET: "test-jwt-secret-key-for-testing-only",
            UNLOCK_SECRET: "test-unlock-secret-key",
            STRIPE_SECRET_KEY: "sk_test_fake",
            STRIPE_WEBHOOK_SECRET: "whsec_test_fake",
            PAYPAL_CLIENT_ID: "test-paypal-client",
            PAYPAL_CLIENT_SECRET: "test-paypal-secret",
            RESEND_API_KEY: "re_test_fake",
            FRONTEND_URL: "http://localhost:3000",
            ENVIRONMENT: "test",
            API_VERSION: "v1",
          },
        },
      },
    },
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      exclude: ["**/__tests__/**", "**/node_modules/**"],
    },
  },
});
