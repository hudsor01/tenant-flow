"use strict";
/**
 * Email Testing Configuration
 *
 * This file provides configuration and utilities for testing email functionality
 * across different environments (development, staging, production)
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.EmailPerformanceTest = exports.EmailAssertions = exports.EmailTestUtils = void 0;
exports.getEmailTestConfig = getEmailTestConfig;
var common_1 = require("@nestjs/common");
/**
 * Get email test configuration based on environment
 */
function getEmailTestConfig(env) {
    var environment = env || process.env.NODE_ENV;
    if (!environment) {
        throw new Error('NODE_ENV is required for email test configuration');
    }
    switch (environment) {
        case "test":
            return {
                environment: "test",
                mockEmails: true,
                logEmails: true,
                testRecipients: ["test@example.com"],
                rateLimit: {
                    maxPerMinute: 100,
                    maxPerHour: 1000,
                    maxPerDay: 10000,
                },
                retryConfig: {
                    maxAttempts: 1,
                    backoffMs: 0,
                    maxBackoffMs: 0,
                },
            };
        case "development":
            return {
                environment: "development",
                mockEmails: false,
                logEmails: true,
                redirectAllTo: process.env.DEV_EMAIL_RECIPIENT || undefined,
                rateLimit: {
                    maxPerMinute: 30,
                    maxPerHour: 500,
                    maxPerDay: 2000,
                },
                retryConfig: {
                    maxAttempts: 3,
                    backoffMs: 1000,
                    maxBackoffMs: 5000,
                },
            };
        case "staging":
            return {
                environment: "staging",
                mockEmails: false,
                logEmails: true,
                testRecipients: [
                    "staging-test1@tenantflow.app",
                    "staging-test2@tenantflow.app",
                ],
                rateLimit: {
                    maxPerMinute: 60,
                    maxPerHour: 1000,
                    maxPerDay: 5000,
                },
                retryConfig: {
                    maxAttempts: 3,
                    backoffMs: 2000,
                    maxBackoffMs: 10000,
                },
            };
        case "production":
            return {
                environment: "production",
                mockEmails: false,
                logEmails: false,
                rateLimit: {
                    maxPerMinute: 100,
                    maxPerHour: 2000,
                    maxPerDay: 20000,
                },
                retryConfig: {
                    maxAttempts: 5,
                    backoffMs: 5000,
                    maxBackoffMs: 30000,
                },
            };
        default:
            return getEmailTestConfig("development");
    }
}
/**
 * Email test utilities
 */
var EmailTestUtils = /** @class */ (function () {
    function EmailTestUtils() {
    }
    /**
     * Mock email sender for testing
     */
    EmailTestUtils.mockSendEmail = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                config = getEmailTestConfig();
                if (config.logEmails) {
                    this.logger.log("Mock Email:", {
                        to: options.to,
                        subject: options.subject,
                        template: options.template,
                        timestamp: new Date().toISOString(),
                    });
                }
                // Store sent email for assertions
                this.sentEmails.push(__assign(__assign({}, options), { timestamp: Date.now(), messageId: "mock_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9)) }));
                this.emailMetrics.sent++;
                return [2 /*return*/, {
                        success: true,
                        messageId: this.sentEmails[this.sentEmails.length - 1].messageId,
                        mock: true,
                    }];
            });
        });
    };
    /**
     * Get all sent emails (for test assertions)
     */
    EmailTestUtils.getSentEmails = function () {
        return __spreadArray([], this.sentEmails, true);
    };
    /**
     * Get emails sent to a specific recipient
     */
    EmailTestUtils.getEmailsTo = function (recipient) {
        return this.sentEmails.filter(function (email) { var _a, _b; return ((_a = email.to) === null || _a === void 0 ? void 0 : _a.includes(recipient)) || ((_b = email.to) === null || _b === void 0 ? void 0 : _b[0]) === recipient; });
    };
    /**
     * Clear sent emails (call between tests)
     */
    EmailTestUtils.clearSentEmails = function () {
        this.sentEmails = [];
    };
    /**
     * Get email metrics
     */
    EmailTestUtils.getMetrics = function () {
        return __assign({}, this.emailMetrics);
    };
    /**
     * Reset metrics
     */
    EmailTestUtils.resetMetrics = function () {
        this.emailMetrics = {
            sent: 0,
            failed: 0,
            retried: 0,
            queued: 0,
        };
    };
    /**
     * Validate email HTML content
     */
    EmailTestUtils.validateEmailHtml = function (html) {
        var errors = [];
        var warnings = [];
        // Check for required elements
        if (!html.includes("<!DOCTYPE html>")) {
            errors.push("Missing DOCTYPE declaration");
        }
        if (!html.includes("<html")) {
            errors.push("Missing html tag");
        }
        if (!html.includes("<head")) {
            errors.push("Missing head tag");
        }
        if (!html.includes("<body")) {
            errors.push("Missing body tag");
        }
        // Check for common issues
        if (!html.includes("charset")) {
            warnings.push("Missing charset declaration");
        }
        if (!html.includes("viewport")) {
            warnings.push("Missing viewport meta tag (mobile compatibility)");
        }
        if (html.includes("<script")) {
            warnings.push("Contains script tags (may be blocked by email clients)");
        }
        if (html.includes("javascript:")) {
            errors.push("Contains javascript: protocol (security risk)");
        }
        // Check for email best practices
        if (!html.includes("alt=")) {
            warnings.push("Images without alt text");
        }
        if (html.length > 102400) {
            warnings.push("HTML size exceeds 100KB (may be clipped)");
        }
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
        };
    };
    /**
     * Generate test email data
     */
    EmailTestUtils.generateTestEmailData = function (template, overrides) {
        var baseData = {
            welcome: {
                email: "test@example.com",
                name: "Test User",
                companySize: "medium",
                source: "test",
            },
            tenant_invitation: {
                tenantName: "Test Tenant",
                propertyAddress: "123 Test St, Apt 4B",
                invitationLink: "https://test.tenantflow.app/invite/test123",
                landlordName: "Test Landlord",
            },
            payment_reminder: {
                tenantName: "Test Tenant",
                amountDue: 1500,
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                propertyAddress: "456 Test Ave",
                paymentLink: "https://test.tenantflow.app/pay/test456",
            },
            lease_expiration: {
                tenantName: "Test Tenant",
                propertyAddress: "789 Test Blvd",
                expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                renewalLink: "https://test.tenantflow.app/renew/test789",
                leaseId: "lease_test_123",
            },
        };
        return __assign(__assign({}, baseData[template]), overrides);
    };
    /**
     * Simulate email delivery with realistic delays
     */
    EmailTestUtils.simulateEmailDelivery = function () {
        return __awaiter(this, arguments, void 0, function (delayMs) {
            if (delayMs === void 0) { delayMs = 100; }
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, delayMs); })];
            });
        });
    };
    /**
     * Check if email would be rate limited
     */
    EmailTestUtils.checkRateLimit = function (sentCount, timeWindowMs, config) {
        var testConfig = config || getEmailTestConfig();
        if (!testConfig.rateLimit) {
            return false;
        }
        var timeWindowMinutes = timeWindowMs / (60 * 1000);
        var timeWindowHours = timeWindowMs / (60 * 60 * 1000);
        var timeWindowDays = timeWindowMs / (24 * 60 * 60 * 1000);
        var ratePerMinute = sentCount / timeWindowMinutes;
        var ratePerHour = sentCount / timeWindowHours;
        var ratePerDay = sentCount / timeWindowDays;
        return (ratePerMinute > testConfig.rateLimit.maxPerMinute ||
            ratePerHour > testConfig.rateLimit.maxPerHour ||
            ratePerDay > testConfig.rateLimit.maxPerDay);
    };
    EmailTestUtils.logger = new common_1.Logger(EmailTestUtils.name);
    EmailTestUtils.sentEmails = [];
    EmailTestUtils.emailMetrics = {
        sent: 0,
        failed: 0,
        retried: 0,
        queued: 0,
    };
    return EmailTestUtils;
}());
exports.EmailTestUtils = EmailTestUtils;
/**
 * Email test assertions
 */
var EmailAssertions = /** @class */ (function () {
    function EmailAssertions() {
    }
    /**
     * Assert email was sent to recipient
     */
    EmailAssertions.assertEmailSent = function (recipient, subject) {
        var emails = EmailTestUtils.getEmailsTo(recipient);
        if (emails.length === 0) {
            throw new Error("No emails sent to ".concat(recipient));
        }
        if (subject) {
            var matchingEmails = emails.filter(function (e) { var _a; return (_a = e.subject) === null || _a === void 0 ? void 0 : _a.includes(subject); });
            if (matchingEmails.length === 0) {
                throw new Error("No emails with subject \"".concat(subject, "\" sent to ").concat(recipient));
            }
        }
    };
    /**
     * Assert no emails sent to recipient
     */
    EmailAssertions.assertNoEmailSent = function (recipient) {
        var emails = EmailTestUtils.getEmailsTo(recipient);
        if (emails.length > 0) {
            throw new Error("Unexpected emails sent to ".concat(recipient, ": ").concat(emails.length, " found"));
        }
    };
    /**
     * Assert email contains content
     */
    EmailAssertions.assertEmailContains = function (recipient, content) {
        var emails = EmailTestUtils.getEmailsTo(recipient);
        if (emails.length === 0) {
            throw new Error("No emails sent to ".concat(recipient));
        }
        var matchingEmails = emails.filter(function (e) { var _a, _b; return ((_a = e.html) === null || _a === void 0 ? void 0 : _a.includes(content)) || ((_b = e.text) === null || _b === void 0 ? void 0 : _b.includes(content)); });
        if (matchingEmails.length === 0) {
            throw new Error("No emails to ".concat(recipient, " contain \"").concat(content, "\""));
        }
    };
    /**
     * Assert email count
     */
    EmailAssertions.assertEmailCount = function (expectedCount, recipient) {
        var emails = recipient
            ? EmailTestUtils.getEmailsTo(recipient)
            : EmailTestUtils.getSentEmails();
        if (emails.length !== expectedCount) {
            throw new Error("Expected ".concat(expectedCount, " emails").concat(recipient ? " to ".concat(recipient) : "", ", ") +
                "but found ".concat(emails.length));
        }
    };
    return EmailAssertions;
}());
exports.EmailAssertions = EmailAssertions;
/**
 * Email performance testing utilities
 */
var EmailPerformanceTest = /** @class */ (function () {
    function EmailPerformanceTest() {
    }
    /**
     * Measure template rendering performance
     */
    EmailPerformanceTest.measureRenderTime = function (renderFn) {
        return __awaiter(this, void 0, void 0, function () {
            var start, end, timeMs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        start = process.hrtime.bigint();
                        return [4 /*yield*/, renderFn()];
                    case 1:
                        _a.sent();
                        end = process.hrtime.bigint();
                        timeMs = Number(end - start) / 1000000;
                        this.metrics.renderTimes.push(timeMs);
                        return [2 /*return*/, timeMs];
                }
            });
        });
    };
    /**
     * Get performance statistics
     */
    EmailPerformanceTest.getStats = function () {
        var calculate = function (times) {
            if (times.length === 0) {
                return null;
            }
            var sorted = __spreadArray([], times, true).sort(function (a, b) { return a - b; });
            var sum = sorted.reduce(function (a, b) { return a + b; }, 0);
            return {
                min: sorted[0],
                max: sorted[sorted.length - 1],
                avg: sum / sorted.length,
                median: sorted[Math.floor(sorted.length / 2)],
                p95: sorted[Math.floor(sorted.length * 0.95)],
                p99: sorted[Math.floor(sorted.length * 0.99)],
            };
        };
        return {
            render: calculate(this.metrics.renderTimes),
            send: calculate(this.metrics.sendTimes),
            total: calculate(this.metrics.totalTimes),
        };
    };
    /**
     * Reset performance metrics
     */
    EmailPerformanceTest.reset = function () {
        this.metrics = {
            renderTimes: [],
            sendTimes: [],
            totalTimes: [],
        };
    };
    EmailPerformanceTest.metrics = {
        renderTimes: [],
        sendTimes: [],
        totalTimes: [],
    };
    return EmailPerformanceTest;
}());
exports.EmailPerformanceTest = EmailPerformanceTest;
