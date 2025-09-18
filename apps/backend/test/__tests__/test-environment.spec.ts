/**
 * Test Environment Configuration Tests
 *
 * Validates test environment setup and configuration utilities
 */

import {
  getTestEnvironment,
  getTestDatabaseConfig,
  getTestSupabaseConfig,
  getTestStripeConfig,
  getTestEmailConfig,
  getTestEnvironmentConfig,
  createTestModule,
  TestDatabaseUtils,
} from "../test-environment";

describe("Test Environment Configuration", () => {
  // Store original env to restore after tests
  const originalEnv = process.env.NODE_ENV;
  const originalTestType = process.env.TEST_TYPE;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.TEST_TYPE = originalTestType;
  });

  describe("getTestEnvironment", () => {
    it("should return unit for default environment", () => {
      delete process.env.TEST_TYPE;
      process.env.NODE_ENV = "development";

      expect(getTestEnvironment()).toBe("unit");
    });

    it("should return integration for NODE_ENV=test", () => {
      delete process.env.TEST_TYPE;
      process.env.NODE_ENV = "test";

      expect(getTestEnvironment()).toBe("integration");
    });

    it("should respect TEST_TYPE environment variable", () => {
      process.env.TEST_TYPE = "e2e";

      expect(getTestEnvironment()).toBe("e2e");
    });
  });

  describe("getTestDatabaseConfig", () => {
    it("should return mock config for unit tests", () => {
      process.env.TEST_TYPE = "unit";

      const config = getTestDatabaseConfig();
      expect(config.url).toBe("mock://localhost/unit_test_db");
      expect(config.host).toBe("localhost");
      expect(config.database).toBe("unit_test_db");
    });

    it("should return real database config for integration tests", () => {
      process.env.TEST_TYPE = "integration";

      const config = getTestDatabaseConfig();
      expect(config.url).toContain("tenantflow_integration_test");
      expect(config.database).toBe("tenantflow_integration_test");
    });

    it("should return e2e database config for e2e tests", () => {
      process.env.TEST_TYPE = "e2e";

      const config = getTestDatabaseConfig();
      expect(config.url).toContain("tenantflow_e2e_test");
      expect(config.database).toBe("tenantflow_e2e_test");
    });
  });

  describe("getTestSupabaseConfig", () => {
    it("should return mock config for unit tests", () => {
      process.env.TEST_TYPE = "unit";

      const config = getTestSupabaseConfig();
      expect(config.url).toBe("https://mock-supabase-project.supabase.co");
      expect(config.anonKey).toBe("mock_anon_key_for_unit_tests");
      expect(config.serviceRoleKey).toBe(
        "mock_service_role_key_for_unit_tests",
      );
    });

    it("should use environment variables for integration tests", () => {
      process.env.TEST_TYPE = "integration";
      process.env.TEST_SUPABASE_URL = "https://test.supabase.co";
      process.env.TEST_SUPABASE_ANON_KEY = "test_anon_key";

      const config = getTestSupabaseConfig();
      expect(config.url).toBe("https://test.supabase.co");
      expect(config.anonKey).toBe("test_anon_key");
    });
  });

  describe("getTestStripeConfig", () => {
    it("should return mock keys for unit tests", () => {
      process.env.TEST_TYPE = "unit";

      const config = getTestStripeConfig();
      expect(config.secretKey).toBe("sk_test_mock_secret_key_for_unit_testing");
      expect(config.publishableKey).toBe(
        "pk_test_mock_publishable_key_for_unit_testing",
      );
      expect(config.webhookSecret).toBe(
        "whsec_mock_webhook_secret_for_unit_testing",
      );
    });

    it("should validate test key format for integration tests", () => {
      process.env.TEST_TYPE = "integration";
      process.env.TEST_STRIPE_SECRET_KEY = "sk_live_invalid_key";

      expect(() => getTestStripeConfig()).toThrow(
        "TEST_STRIPE_SECRET_KEY must start with 'sk_test_'",
      );
    });

    it("should accept properly formatted test keys", () => {
      process.env.TEST_TYPE = "integration";
      process.env.TEST_STRIPE_SECRET_KEY = "sk_test_valid_test_key";
      process.env.TEST_STRIPE_PUBLISHABLE_KEY = "pk_test_valid_test_key";
      process.env.TEST_STRIPE_WEBHOOK_SECRET = "whsec_valid_webhook_secret";

      const config = getTestStripeConfig();
      expect(config.secretKey).toBe("sk_test_valid_test_key");
      expect(config.publishableKey).toBe("pk_test_valid_test_key");
      expect(config.webhookSecret).toBe("whsec_valid_webhook_secret");
    });

    it("should use fallback keys when environment variables are not set", () => {
      process.env.TEST_TYPE = "integration";
      delete process.env.TEST_STRIPE_SECRET_KEY;
      delete process.env.TEST_STRIPE_PUBLISHABLE_KEY;
      delete process.env.TEST_STRIPE_WEBHOOK_SECRET;

      const config = getTestStripeConfig();
      expect(config.secretKey).toBe(
        "sk_test_placeholder_key_see_stripe_test_setup_md",
      );
      expect(config.publishableKey).toBe(
        "pk_test_placeholder_key_see_stripe_test_setup_md",
      );
      expect(config.webhookSecret).toBe(
        "whsec_placeholder_secret_see_stripe_test_setup_md",
      );
    });
  });

  describe("getTestEmailConfig", () => {
    it("should return test email configuration", () => {
      const config = getTestEmailConfig();
      expect(config.resendApiKey).toBeDefined();
      expect(typeof config.resendApiKey).toBe("string");
    });
  });

  describe("getTestEnvironmentConfig", () => {
    it("should combine all test configurations", () => {
      process.env.TEST_TYPE = "unit";

      const config = getTestEnvironmentConfig();
      expect(config.database).toBeDefined();
      expect(config.supabase).toBeDefined();
      expect(config.stripe).toBeDefined();
      expect(config.email).toBeDefined();

      expect(config.stripe.secretKey).toContain("mock");
      expect(config.database.url).toContain("mock");
    });
  });

  describe("TestDatabaseUtils", () => {
    it("should handle unit test cleanup gracefully", async () => {
      process.env.TEST_TYPE = "unit";

      // These should not throw for unit tests
      await expect(TestDatabaseUtils.cleanDatabase()).resolves.toBeUndefined();
      await expect(TestDatabaseUtils.seedTestData()).resolves.toBeUndefined();
      await expect(
        TestDatabaseUtils.setupTestDatabase(),
      ).resolves.toBeUndefined();
    });
  });

  describe("createTestModule", () => {
    it("should create test module with proper configuration", async () => {
      process.env.TEST_TYPE = "unit";

      const module = await createTestModule({
        providers: [],
        controllers: [],
        imports: [],
      });

      expect(module).toBeDefined();
      expect(module.get).toBeDefined(); // TestingModule has get method, not compile

      // Verify environment variables were set
      expect(process.env.NODE_ENV).toBe("test");
      expect(process.env.STRIPE_SECRET_KEY).toContain("mock");

      await module.close();
    });
  });
});
