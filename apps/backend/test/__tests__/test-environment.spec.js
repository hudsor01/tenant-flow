"use strict";
/**
 * Test Environment Configuration Tests
 *
 * Validates test environment setup and configuration utilities
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
var test_environment_1 = require("../test-environment");
describe('Test Environment Configuration', function () {
    // Store original env to restore after tests
    var originalEnv = process.env.NODE_ENV;
    var originalTestType = process.env.TEST_TYPE;
    afterEach(function () {
        process.env.NODE_ENV = originalEnv;
        process.env.TEST_TYPE = originalTestType;
    });
    describe('getTestEnvironment', function () {
        it('should return unit for default environment', function () {
            delete process.env.TEST_TYPE;
            process.env.NODE_ENV = 'development';
            expect((0, test_environment_1.getTestEnvironment)()).toBe('unit');
        });
        it('should return integration for NODE_ENV=test', function () {
            delete process.env.TEST_TYPE;
            process.env.NODE_ENV = 'test';
            expect((0, test_environment_1.getTestEnvironment)()).toBe('integration');
        });
        it('should respect TEST_TYPE environment variable', function () {
            process.env.TEST_TYPE = 'e2e';
            expect((0, test_environment_1.getTestEnvironment)()).toBe('e2e');
        });
    });
    describe('getTestDatabaseConfig', function () {
        it('should return mock config for unit tests', function () {
            process.env.TEST_TYPE = 'unit';
            var config = (0, test_environment_1.getTestDatabaseConfig)();
            expect(config.url).toBe('mock://localhost/unit_test_db');
            expect(config.host).toBe('localhost');
            expect(config.database).toBe('unit_test_db');
        });
        it('should return real database config for integration tests', function () {
            process.env.TEST_TYPE = 'integration';
            var config = (0, test_environment_1.getTestDatabaseConfig)();
            expect(config.url).toContain('postgres');
            expect(config.database).toBe('postgres');
        });
        it('should return e2e database config for e2e tests', function () {
            process.env.TEST_TYPE = 'e2e';
            var config = (0, test_environment_1.getTestDatabaseConfig)();
            expect(config.url).toContain('postgres');
            expect(config.database).toBe('postgres');
        });
    });
    describe('getTestSupabaseConfig', function () {
        it('should return mock config for unit tests', function () {
            process.env.TEST_TYPE = 'unit';
            var config = (0, test_environment_1.getTestSupabaseConfig)();
            expect(config.url).toBe('https://mock-supabase-project.supabase.co');
            expect(config.anonKey).toBe('mock_anon_key_for_unit_tests');
            expect(config.serviceRoleKey).toBe('mock_service_role_key_for_unit_tests');
        });
        it('should use environment variables for integration tests', function () {
            process.env.TEST_TYPE = 'integration';
            process.env.TEST_SUPABASE_URL = 'https://test.supabase.co';
            process.env.TEST_SUPABASE_ANON_KEY = 'test_anon_key';
            var config = (0, test_environment_1.getTestSupabaseConfig)();
            expect(config.url).toBe('https://test.supabase.co');
            expect(config.anonKey).toBe('test_anon_key');
        });
    });
    describe('getTestStripeConfig', function () {
        it('should return mock keys for unit tests', function () {
            process.env.TEST_TYPE = 'unit';
            var config = (0, test_environment_1.getTestStripeConfig)();
            expect(config.secretKey).toBe('sk_test_mock_secret_key_for_unit_testing');
            expect(config.publishableKey).toBe('pk_test_mock_publishable_key_for_unit_testing');
            expect(config.webhookSecret).toBe('whsec_mock_webhook_secret_for_unit_testing');
        });
        it('should validate test key format for integration tests', function () {
            process.env.TEST_TYPE = 'integration';
            process.env.TEST_STRIPE_SECRET_KEY = 'sk_live_invalid_key';
            expect(function () { return (0, test_environment_1.getTestStripeConfig)(); }).toThrow("TEST_STRIPE_SECRET_KEY must start with 'sk_test_'");
        });
        it('should accept properly formatted test keys', function () {
            process.env.TEST_TYPE = 'integration';
            process.env.TEST_STRIPE_SECRET_KEY = 'sk_test_valid_test_key';
            process.env.TEST_STRIPE_PUBLISHABLE_KEY = 'pk_test_valid_test_key';
            process.env.TEST_STRIPE_WEBHOOK_SECRET = 'whsec_valid_webhook_secret';
            var config = (0, test_environment_1.getTestStripeConfig)();
            expect(config.secretKey).toBe('sk_test_valid_test_key');
            expect(config.publishableKey).toBe('pk_test_valid_test_key');
            expect(config.webhookSecret).toBe('whsec_valid_webhook_secret');
        });
        it('should throw error when environment variables are not set', function () {
            process.env.TEST_TYPE = 'integration';
            delete process.env.TEST_STRIPE_SECRET_KEY;
            delete process.env.TEST_STRIPE_PUBLISHABLE_KEY;
            delete process.env.TEST_STRIPE_WEBHOOK_SECRET;
            expect(function () { return (0, test_environment_1.getTestStripeConfig)(); }).toThrow('TEST_STRIPE_SECRET_KEY is required for integration/e2e tests');
        });
    });
    describe('getTestEmailConfig', function () {
        it('should return test email configuration', function () {
            var config = (0, test_environment_1.getTestEmailConfig)();
            expect(config.resendApiKey).toBeDefined();
            expect(typeof config.resendApiKey).toBe('string');
        });
    });
    describe('getTestEnvironmentConfig', function () {
        it('should combine all test configurations', function () {
            process.env.TEST_TYPE = 'unit';
            var config = (0, test_environment_1.getTestEnvironmentConfig)();
            expect(config.database).toBeDefined();
            expect(config.supabase).toBeDefined();
            expect(config.stripe).toBeDefined();
            expect(config.email).toBeDefined();
            expect(config.stripe.secretKey).toContain('mock');
            expect(config.database.url).toContain('mock');
        });
    });
    describe('TestDatabaseUtils', function () {
        it('should handle unit test cleanup gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        process.env.TEST_TYPE = 'unit';
                        // These should not throw for unit tests
                        return [4 /*yield*/, expect(test_environment_1.TestDatabaseUtils.cleanDatabase()).resolves.toBeUndefined()];
                    case 1:
                        // These should not throw for unit tests
                        _a.sent();
                        return [4 /*yield*/, expect(test_environment_1.TestDatabaseUtils.seedTestData()).resolves.toBeUndefined()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, expect(test_environment_1.TestDatabaseUtils.setupTestDatabase()).resolves.toBeUndefined()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('createTestModule', function () {
        it('should create test module with proper configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var module;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        process.env.TEST_TYPE = 'unit';
                        return [4 /*yield*/, (0, test_environment_1.createTestModule)({
                                providers: [],
                                controllers: [],
                                imports: []
                            })];
                    case 1:
                        module = _a.sent();
                        expect(module).toBeDefined();
                        expect(module.get).toBeDefined(); // TestingModule has get method, not compile
                        // Verify environment variables were set
                        expect(process.env.NODE_ENV).toBe('test');
                        expect(process.env.STRIPE_SECRET_KEY).toContain('mock');
                        return [4 /*yield*/, module.close()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
