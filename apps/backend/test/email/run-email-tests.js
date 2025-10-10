#!/usr/bin/env ts-node
"use strict";
/**
 * Email System Test Runner
 *
 * This script runs all email-related tests and generates a report
 * Can be used in CI/CD pipelines or for local testing
 *
 * Usage: npx ts-node test/email/run-email-tests.ts [--env=production] [--verbose]
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
var common_1 = require("@nestjs/common");
var child_process_1 = require("child_process");
var fs = require("fs");
var path = require("path");
var EmailTestRunner = /** @class */ (function () {
    function EmailTestRunner(args) {
        var _this = this;
        this.logger = new common_1.Logger(EmailTestRunner.name);
        this.results = [];
        this.startTime = Date.now();
        this.verbose = false;
        this.environment = 'test';
        // Parse command line arguments
        args.forEach(function (arg) {
            if (arg.startsWith('--env=')) {
                _this.environment = arg.split('=')[1];
            }
            if (arg === '--verbose' || arg === '-v') {
                _this.verbose = true;
            }
        });
    }
    /**
     * Run all email tests
     */
    EmailTestRunner.prototype.runAllTests = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.log('🧪 Starting Email System Test Suite');
                        this.logger.log("[LOCATION] Environment: ".concat(this.environment));
                        this.logger.log("[INFO] Verbose: ".concat(this.verbose));
                        this.logger.log('─'.repeat(50));
                        // Set environment
                        process.env.NODE_ENV = this.environment;
                        // Run test suites in sequence
                        return [4 /*yield*/, this.runTestSuite('Unit Tests - EmailTemplateService', 'pnpm test -- email-template.service.spec.ts')];
                    case 1:
                        // Run test suites in sequence
                        _a.sent();
                        return [4 /*yield*/, this.runTestSuite('Unit Tests - EmailService', 'pnpm test -- email.service.spec.ts')];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.runTestSuite('E2E Tests - Email Workflows', 'pnpm test:e2e -- email-workflows.e2e-spec.ts')
                            // Run performance tests if not in CI
                        ];
                    case 3:
                        _a.sent();
                        if (!(process.env.CI !== 'true')) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.runPerformanceTests()];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        // Generate and display report
                        this.generateReport();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Run a single test suite
     */
    EmailTestRunner.prototype.runTestSuite = function (name, command) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, result, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.log("\n\u25B6\uFE0F  Running: ".concat(name));
                        startTime = Date.now();
                        result = {
                            suite: name,
                            passed: 0,
                            failed: 0,
                            skipped: 0,
                            duration: 0,
                            errors: []
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var _a, _b;
                                var _c = command.split(' '), cmd = _c[0], args = _c.slice(1);
                                var testProcess = (0, child_process_1.spawn)(cmd, args, {
                                    stdio: _this.verbose ? 'inherit' : 'pipe',
                                    shell: true
                                });
                                var output = '';
                                if (!_this.verbose) {
                                    (_a = testProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (data) {
                                        output += data.toString();
                                        // Parse Jest output
                                        var passMatch = data.toString().match(/[PASS].*\((\d+) test/g);
                                        var failMatch = data.toString().match(/[FAIL].*\((\d+) test/g);
                                        var skipMatch = data.toString().match(/○.*\((\d+) test/g);
                                        if (passMatch)
                                            result.passed = passMatch.length;
                                        if (failMatch)
                                            result.failed = failMatch.length;
                                        if (skipMatch)
                                            result.skipped = skipMatch.length;
                                    });
                                    (_b = testProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
                                        output += data.toString();
                                        result.errors.push(data.toString());
                                    });
                                }
                                testProcess.on('close', function (code) {
                                    result.duration = Date.now() - startTime;
                                    if (code === 0) {
                                        _this.logger.log("   [OK] Passed (".concat(result.duration, "ms)"));
                                        resolve();
                                    }
                                    else {
                                        _this.logger.log("   [ERROR] Failed (".concat(result.duration, "ms)"));
                                        if (_this.verbose) {
                                            _this.logger.log(output);
                                        }
                                        resolve(); // Continue to next test even if this one fails
                                    }
                                });
                                testProcess.on('error', function (error) {
                                    result.errors.push(error.message);
                                    result.duration = Date.now() - startTime;
                                    _this.logger.log("   [WARNING]  Error: ".concat(error.message));
                                    resolve();
                                });
                            })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        result.failed++;
                        result.errors.push(error_1 instanceof Error ? error_1.message : String(error_1));
                        result.duration = Date.now() - startTime;
                        return [3 /*break*/, 4];
                    case 4:
                        this.results.push(result);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Run performance tests
     */
    EmailTestRunner.prototype.runPerformanceTests = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result, startTime, EmailTemplateService, service, templates, renderTimes, _i, templates_1, template, templateStart, renderTime, avgTime, maxTime, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.log('\n▶️  Running: Performance Tests');
                        result = {
                            suite: 'Performance Tests',
                            passed: 0,
                            failed: 0,
                            skipped: 0,
                            duration: 0,
                            errors: []
                        };
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../../src/emails/email-template.service'); })];
                    case 2:
                        EmailTemplateService = (_a.sent()).EmailTemplateService;
                        service = new EmailTemplateService();
                        templates = [
                            'subscriptionCreated',
                            'subscriptionCancelled',
                            'paymentFailed',
                            'trialEndingSoon'
                        ];
                        renderTimes = [];
                        _i = 0, templates_1 = templates;
                        _a.label = 3;
                    case 3:
                        if (!(_i < templates_1.length)) return [3 /*break*/, 6];
                        template = templates_1[_i];
                        templateStart = Date.now();
                        return [4 /*yield*/, service.renderTemplate(template, {
                                to: 'perf@test.com',
                                customerName: 'Performance Test',
                                planName: 'Pro Plan',
                                amount: 9999,
                                currency: 'usd',
                                interval: 'month',
                                nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 1000).toISOString(),
                                trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 1000).toISOString(),
                                failureReason: 'Insufficient funds'
                            })];
                    case 4:
                        _a.sent();
                        renderTime = Date.now() - templateStart;
                        renderTimes.push(renderTime);
                        if (renderTime < 500) {
                            result.passed++;
                            this.logger.log("   [OK] ".concat(template, ": ").concat(renderTime, "ms"));
                        }
                        else {
                            result.failed++;
                            result.errors.push("".concat(template, " rendering too slow: ").concat(renderTime, "ms"));
                            this.logger.log("   [ERROR] ".concat(template, ": ").concat(renderTime, "ms (>500ms)"));
                        }
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        avgTime = renderTimes.reduce(function (a, b) { return a + b; }, 0) / renderTimes.length;
                        maxTime = Math.max.apply(Math, renderTimes);
                        this.logger.log("   [STATS] Average: ".concat(avgTime.toFixed(2), "ms, Max: ").concat(maxTime, "ms"));
                        return [3 /*break*/, 8];
                    case 7:
                        error_2 = _a.sent();
                        result.failed++;
                        result.errors.push(error_2 instanceof Error ? error_2.message : String(error_2));
                        this.logger.log("   [WARNING]  Error: ".concat(error_2));
                        return [3 /*break*/, 8];
                    case 8:
                        result.duration = Date.now() - startTime;
                        this.results.push(result);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate test report
     */
    EmailTestRunner.prototype.generateReport = function () {
        var _this = this;
        var totalDuration = Date.now() - this.startTime;
        var totalPassed = this.results.reduce(function (sum, r) { return sum + r.passed; }, 0);
        var totalFailed = this.results.reduce(function (sum, r) { return sum + r.failed; }, 0);
        var totalSkipped = this.results.reduce(function (sum, r) { return sum + r.skipped; }, 0);
        this.logger.log('\n' + '═'.repeat(50));
        this.logger.log('[STATS] EMAIL SYSTEM TEST REPORT');
        this.logger.log('═'.repeat(50));
        // Summary
        this.logger.log('\n[METRICS] Summary:');
        this.logger.log("   Total Tests: ".concat(totalPassed + totalFailed + totalSkipped));
        this.logger.log("   [OK] Passed: ".concat(totalPassed));
        this.logger.log("   [ERROR] Failed: ".concat(totalFailed));
        this.logger.log("   \u23ED\uFE0F  Skipped: ".concat(totalSkipped));
        this.logger.log("   \u23F1\uFE0F  Duration: ".concat((totalDuration / 1000).toFixed(2), "s"));
        var passRate = (totalPassed / (totalPassed + totalFailed)) * 100;
        this.logger.log("   [STATS] Pass Rate: ".concat(passRate.toFixed(1), "%"));
        // Details by suite
        this.logger.log('\n[REPORT] Test Suites:');
        this.results.forEach(function (result) {
            var icon = result.failed === 0 ? '[OK]' : '[ERROR]';
            _this.logger.log("\n   ".concat(icon, " ").concat(result.suite));
            _this.logger.log("      Passed: ".concat(result.passed, ", Failed: ").concat(result.failed, ", Skipped: ").concat(result.skipped));
            _this.logger.log("      Duration: ".concat((result.duration / 1000).toFixed(2), "s"));
            if (result.errors.length > 0 && _this.verbose) {
                _this.logger.log('      Errors:');
                result.errors.forEach(function (error) {
                    _this.logger.log("         - ".concat(error.substring(0, 100), "..."));
                });
            }
        });
        // Coverage estimate
        this.logger.log('\n[METRICS] Coverage Estimate:');
        var coverageItems = [
            { name: 'Template Rendering', covered: totalPassed > 0 },
            { name: 'Email Sending', covered: totalPassed > 5 },
            { name: 'Error Handling', covered: totalPassed > 10 },
            {
                name: 'Rate Limiting',
                covered: this.results.some(function (r) { return r.suite.includes('Integration'); })
            },
            {
                name: 'Retry Logic',
                covered: this.results.some(function (r) { return r.suite.includes('E2E'); })
            },
            {
                name: 'Performance',
                covered: this.results.some(function (r) { return r.suite.includes('Performance'); })
            }
        ];
        coverageItems.forEach(function (item) {
            var icon = item.covered ? '[OK]' : '[ERROR]';
            _this.logger.log("   ".concat(icon, " ").concat(item.name));
        });
        var coverage = (coverageItems.filter(function (i) { return i.covered; }).length / coverageItems.length) * 100;
        this.logger.log("   [STATS] Overall Coverage: ".concat(coverage.toFixed(0), "%"));
        // Recommendations
        this.logger.log('\n[TIP] Recommendations:');
        if (totalFailed > 0) {
            this.logger.log('   [WARNING]  Fix failing tests before deployment');
        }
        if (passRate < 90) {
            this.logger.log('   [WARNING]  Pass rate below 90%, investigate failures');
        }
        if (coverage < 80) {
            this.logger.log('   [WARNING]  Coverage below 80%, add more tests');
        }
        if (this.results.some(function (r) { return r.duration > 30000; })) {
            this.logger.log('   [WARNING]  Some tests taking >30s, consider optimization');
        }
        // Save report to file
        this.saveReport(totalPassed, totalFailed, totalSkipped, totalDuration, passRate, coverage);
        // Exit code
        var exitCode = totalFailed > 0 ? 1 : 0;
        this.logger.log('\n' + '═'.repeat(50));
        this.logger.log(exitCode === 0 ? '[OK] All tests passed!' : '[ERROR] Some tests failed');
        process.exit(exitCode);
    };
    /**
     * Save report to JSON file
     */
    EmailTestRunner.prototype.saveReport = function (passed, failed, skipped, duration, passRate, coverage) {
        var report = {
            timestamp: new Date().toISOString(),
            environment: this.environment,
            summary: {
                totalTests: passed + failed + skipped,
                passed: passed,
                failed: failed,
                skipped: skipped,
                duration: duration,
                passRate: passRate,
                coverage: coverage
            },
            suites: this.results,
            metadata: {
                nodeVersion: process.version,
                platform: process.platform,
                ci: process.env.CI === 'true'
            }
        };
        var reportPath = path.join(__dirname, "email-test-report-".concat(Date.now(), ".json"));
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.logger.log("\n[DOC] Report saved to: ".concat(reportPath));
    };
    return EmailTestRunner;
}());
// Run the test runner
var moduleLogger = new common_1.Logger('EmailTestRunner');
var runner = new EmailTestRunner(process.argv.slice(2));
runner.runAllTests().catch(function (error) {
    moduleLogger.error('[ERROR] Test runner failed:', error);
    process.exit(1);
});
