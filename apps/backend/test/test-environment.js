"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDatabaseUtils = void 0;
exports.getTestEnvironment = getTestEnvironment;
exports.getTestDatabaseConfig = getTestDatabaseConfig;
exports.getTestSupabaseConfig = getTestSupabaseConfig;
exports.getTestStripeConfig = getTestStripeConfig;
exports.getTestEmailConfig = getTestEmailConfig;
exports.getTestEnvironmentConfig = getTestEnvironmentConfig;
exports.createTestModule = createTestModule;
var common_1 = require("@nestjs/common");
var config_1 = require("@nestjs/config");
var testing_1 = require("@nestjs/testing");
var moduleLogger = new common_1.Logger('TestEnvironment');
/**
 * Test Environment Detection
 * Determines which test environment to use based on NODE_ENV and availability
 */
function getTestEnvironment() {
    var env = process.env.NODE_ENV;
    var testType = process.env.TEST_TYPE;
    if (testType)
        return testType;
    if (env === 'test')
        return 'integration';
    return 'unit';
}
/**
 * Test Database Configuration
 * Provides isolated test databases for different test types
 */
function getTestDatabaseConfig() {
    var testEnv = getTestEnvironment();
    switch (testEnv) {
        case 'unit':
            // Unit tests use mocked database
            return {
                url: 'mock://localhost/unit_test_db',
                host: 'localhost',
                port: 5432,
                database: 'unit_test_db',
                user: 'test_user',
                password: 'test_password'
            };
        case 'integration':
            // Integration tests use real test database
            if (!process.env.TEST_DATABASE_URL) {
                throw new Error('TEST_DATABASE_URL is required for integration tests');
            }
            if (!process.env.TEST_DATABASE_HOST) {
                throw new Error('TEST_DATABASE_HOST is required for integration tests');
            }
            return {
                url: process.env.TEST_DATABASE_URL,
                host: process.env.TEST_DATABASE_HOST,
                port: parseInt(process.env.TEST_DATABASE_PORT || '5432', 10),
                database: process.env.TEST_DATABASE_NAME || 'tenantflow_integration_test',
                user: process.env.TEST_DATABASE_USER || 'test',
                password: process.env.TEST_DATABASE_PASSWORD || 'test'
            };
        case 'e2e':
            // E2E tests use dedicated e2e database
            if (!process.env.E2E_DATABASE_URL) {
                throw new Error('E2E_DATABASE_URL is required for e2e tests');
            }
            if (!process.env.E2E_DATABASE_HOST) {
                throw new Error('E2E_DATABASE_HOST is required for e2e tests');
            }
            return {
                url: process.env.E2E_DATABASE_URL,
                host: process.env.E2E_DATABASE_HOST,
                port: parseInt(process.env.E2E_DATABASE_PORT || '5432', 10),
                database: process.env.E2E_DATABASE_NAME || 'tenantflow_e2e_test',
                user: process.env.E2E_DATABASE_USER || 'test',
                password: process.env.E2E_DATABASE_PASSWORD || 'test'
            };
        default:
            throw new Error("Unknown test environment: ".concat(testEnv));
    }
}
/**
 * Test Supabase Configuration
 * Uses either test project or mocked Supabase depending on test type
 */
function getTestSupabaseConfig() {
    var testEnv = getTestEnvironment();
    if (testEnv === 'unit') {
        // Unit tests use mocked Supabase
        return {
            url: 'https://mock-supabase-project.supabase.co',
            anonKey: 'mock_anon_key_for_unit_tests',
            serviceRoleKey: 'mock_service_role_key_for_unit_tests',
            jwtSecret: 'mock_jwt_secret_for_unit_tests'
        };
    }
    // Integration and E2E tests use real test Supabase project
    // Require explicit environment variables - no silent fallbacks
    var url = process.env.TEST_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        (function () {
            throw new Error('TEST_SUPABASE_URL or SUPABASE_URL environment variable is required for integration/e2e tests');
        })();
    var anonKey = process.env.TEST_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        (function () {
            throw new Error('TEST_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY environment variable is required for integration/e2e tests');
        })();
    var serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (function () {
            throw new Error('TEST_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is required for integration/e2e tests');
        })();
    var jwtSecret = process.env.TEST_SUPABASE_JWT_SECRET ||
        process.env.SUPABASE_JWT_SECRET ||
        (function () {
            throw new Error('TEST_SUPABASE_JWT_SECRET or SUPABASE_JWT_SECRET environment variable is required for integration/e2e tests');
        })();
    // Error handling now done by IIFE patterns above
    return {
        url: url,
        anonKey: anonKey,
        serviceRoleKey: serviceRoleKey,
        jwtSecret: jwtSecret
    };
}
/**
 * Test Stripe Configuration
 * Always uses Stripe test keys for all test environments
 */
function getTestStripeConfig() {
    var testEnv = getTestEnvironment();
    // For unit tests, always use mock keys
    if (testEnv === 'unit') {
        return {
            secretKey: 'sk_test_mock_secret_key_for_unit_testing',
            webhookSecret: 'whsec_mock_webhook_secret_for_unit_testing',
            publishableKey: 'pk_test_mock_publishable_key_for_unit_testing'
        };
    }
    // For integration/e2e tests, require actual test keys
    var secretKey = process.env.TEST_STRIPE_SECRET_KEY;
    var webhookSecret = process.env.TEST_STRIPE_WEBHOOK_SECRET;
    var publishableKey = process.env.TEST_STRIPE_PUBLISHABLE_KEY;
    // Validate test keys are properly formatted
    if (secretKey && !secretKey.startsWith('sk_test_')) {
        throw new Error("TEST_STRIPE_SECRET_KEY must start with 'sk_test_'. Got: ".concat(secretKey.substring(0, 10), "..."));
    }
    if (publishableKey && !publishableKey.startsWith('pk_test_')) {
        throw new Error("TEST_STRIPE_PUBLISHABLE_KEY must start with 'pk_test_'. Got: ".concat(publishableKey.substring(0, 10), "..."));
    }
    if (webhookSecret && !webhookSecret.startsWith('whsec_')) {
        throw new Error("TEST_STRIPE_WEBHOOK_SECRET must start with 'whsec_'. Got: ".concat(webhookSecret.substring(0, 10), "..."));
    }
    // Warn if using placeholder keys
    if (secretKey === null || secretKey === void 0 ? void 0 : secretKey.includes('Replace')) {
        moduleLogger.warn('Using placeholder Stripe test keys. See apps/backend/test/stripe-test-setup.md for setup instructions.');
    }
    if (!secretKey) {
        throw new Error('TEST_STRIPE_SECRET_KEY is required for integration/e2e tests. See apps/backend/test/stripe-test-setup.md for setup instructions.');
    }
    if (!webhookSecret) {
        throw new Error('TEST_STRIPE_WEBHOOK_SECRET is required for integration/e2e tests. See apps/backend/test/stripe-test-setup.md for setup instructions.');
    }
    if (!publishableKey) {
        throw new Error('TEST_STRIPE_PUBLISHABLE_KEY is required for integration/e2e tests. See apps/backend/test/stripe-test-setup.md for setup instructions.');
    }
    return {
        secretKey: secretKey,
        webhookSecret: webhookSecret,
        publishableKey: publishableKey
    };
}
/**
 * Test Email Configuration
 * Uses test/mock email service for all environments
 */
function getTestEmailConfig() {
    var testEnv = getTestEnvironment();
    if (testEnv === 'unit') {
        // Unit tests use mocked email service
        return {
            resendApiKey: 'mock_resend_api_key_for_unit_tests'
        };
    }
    // Integration and E2E tests require real test API key
    var resendApiKey = process.env.TEST_RESEND_API_KEY;
    if (!resendApiKey) {
        throw new Error('TEST_RESEND_API_KEY is required for integration/e2e tests');
    }
    return {
        resendApiKey: resendApiKey
    };
}
/**
 * Complete Test Environment Configuration
 * Combines all test configurations into a single object
 */
function getTestEnvironmentConfig() {
    return {
        database: getTestDatabaseConfig(),
        supabase: getTestSupabaseConfig(),
        stripe: getTestStripeConfig(),
        email: getTestEmailConfig()
    };
}
/**
 * Create Test Module with Environment Configuration
 * Helper function to create NestJS test modules with proper test environment
 */
function createTestModule(moduleMetadata) {
    return __awaiter(this, void 0, void 0, function () {
        var testConfig;
        return __generator(this, function (_a) {
            testConfig = getTestEnvironmentConfig();
            // Set environment variables for test
            process.env.NODE_ENV = 'test';
            process.env.DATABASE_URL = testConfig.database.url;
            process.env.SUPABASE_URL = testConfig.supabase.url;
            process.env.SUPABASE_ANON_KEY = testConfig.supabase.anonKey;
            process.env.SUPABASE_SERVICE_ROLE_KEY = testConfig.supabase.serviceRoleKey;
            process.env.SUPABASE_JWT_SECRET = testConfig.supabase.jwtSecret;
            process.env.STRIPE_SECRET_KEY = testConfig.stripe.secretKey;
            process.env.STRIPE_WEBHOOK_SECRET = testConfig.stripe.webhookSecret;
            process.env.STRIPE_PUBLISHABLE_KEY = testConfig.stripe.publishableKey;
            process.env.RESEND_API_KEY = testConfig.email.resendApiKey;
            return [2 /*return*/, testing_1.Test.createTestingModule({
                    imports: __spreadArray([
                        config_1.ConfigModule.forRoot({
                            isGlobal: true,
                            ignoreEnvFile: true, // Use environment variables set above
                            ignoreEnvVars: false
                        })
                    ], ((moduleMetadata === null || moduleMetadata === void 0 ? void 0 : moduleMetadata.imports) || []), true),
                    controllers: (moduleMetadata === null || moduleMetadata === void 0 ? void 0 : moduleMetadata.controllers) || [],
                    providers: (moduleMetadata === null || moduleMetadata === void 0 ? void 0 : moduleMetadata.providers) || [],
                    exports: (moduleMetadata === null || moduleMetadata === void 0 ? void 0 : moduleMetadata.exports) || []
                }).compile()];
        });
    });
}
/**
 * Test Database Utilities
 * Helper functions for database setup and teardown in tests
 */
var TestDatabaseUtils = /** @class */ (function () {
    function TestDatabaseUtils() {
    }
    /**
     * Clean test database
     * Removes all data while preserving schema
     */
    TestDatabaseUtils.cleanDatabase = function () {
        return __awaiter(this, void 0, void 0, function () {
            var testEnv;
            return __generator(this, function (_a) {
                testEnv = getTestEnvironment();
                if (testEnv === 'unit') {
                    // Unit tests don't need database cleanup (mocked)
                    return [2 /*return*/];
                }
                // For integration/e2e tests, implement database cleanup
                // This would typically connect to test database and truncate tables
                TestDatabaseUtils.logger.verbose("Cleaning test database for ".concat(testEnv, " tests..."));
                return [2 /*return*/];
            });
        });
    };
    /**
     * Seed test database
     * Adds necessary test data
     */
    TestDatabaseUtils.seedTestData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var testEnv;
            return __generator(this, function (_a) {
                testEnv = getTestEnvironment();
                if (testEnv === 'unit') {
                    // Unit tests don't need database seeding (mocked)
                    return [2 /*return*/];
                }
                TestDatabaseUtils.logger.verbose("Seeding test database for ".concat(testEnv, " tests..."));
                return [2 /*return*/];
            });
        });
    };
    /**
     * Setup test database
     * Creates necessary tables and initial data
     */
    TestDatabaseUtils.setupTestDatabase = function () {
        return __awaiter(this, void 0, void 0, function () {
            var testEnv;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        testEnv = getTestEnvironment();
                        if (testEnv === 'unit') {
                            // Unit tests don't need database setup (mocked)
                            return [2 /*return*/];
                        }
                        TestDatabaseUtils.logger.verbose("Setting up test database for ".concat(testEnv, " tests..."));
                        return [4 /*yield*/, this.cleanDatabase()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.seedTestData()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TestDatabaseUtils.logger = new common_1.Logger(TestDatabaseUtils.name);
    return TestDatabaseUtils;
}());
exports.TestDatabaseUtils = TestDatabaseUtils;
