import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    globals: true,
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.test.toml" },
        miniflare: {
          // D1, KV, and R2 bindings are defined in wrangler.test.toml
          // Only provide secret values here that wrangler.test.toml doesn't include
          bindings: {
            JWT_SECRET: "test-jwt-secret-key-for-testing-only",
            UNLOCK_SECRET: "test-unlock-secret-key",
            STRIPE_SECRET_KEY: "sk_test_fake",
            STRIPE_WEBHOOK_SECRET: "whsec_test_fake",
            PAYPAL_CLIENT_ID: "test-paypal-client",
            PAYPAL_CLIENT_SECRET: "test-paypal-secret",
            RESEND_API_KEY: "re_test_fake",
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
