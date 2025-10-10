"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("@nestjs/common");
var supabase_js_1 = require("@supabase/supabase-js");
var StripeSchemaValidator = /** @class */ (function () {
    function StripeSchemaValidator() {
        this.logger = new common_1.Logger(StripeSchemaValidator.name);
        var supabaseUrl = process.env.SUPABASE_URL;
        var serviceKey = (function () {
            if (process.env.SUPABASE_SERVICE_ROLE_KEY)
                return process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (process.env.SERVICE_ROLE_KEY)
                return process.env.SERVICE_ROLE_KEY;
            throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for schema validation');
        })();
        if (!supabaseUrl) {
            throw new Error('SUPABASE_URL environment variable is required for schema validation');
        }
        this.client = (0, supabase_js_1.createClient)(supabaseUrl, serviceKey);
    }
    StripeSchemaValidator.prototype.validateSchema = function () {
        return __awaiter(this, void 0, void 0, function () {
            var schemaExists, tableCount, keyTables, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.checkSchemaExists()];
                    case 1:
                        schemaExists = _a.sent();
                        if (!schemaExists.success) {
                            return [2 /*return*/, schemaExists];
                        }
                        return [4 /*yield*/, this.countStripeTables()];
                    case 2:
                        tableCount = _a.sent();
                        if (!tableCount.success) {
                            return [2 /*return*/, tableCount];
                        }
                        return [4 /*yield*/, this.validateKeyTables()];
                    case 3:
                        keyTables = _a.sent();
                        if (!keyTables.success) {
                            return [2 /*return*/, __assign(__assign({}, keyTables), { tableCount: tableCount.tableCount })];
                        }
                        return [4 /*yield*/, this.checkCustomerCount()];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                message: 'Stripe schema validation completed successfully',
                                tableCount: tableCount.tableCount
                            }];
                    case 5:
                        error_1 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                message: error_1 instanceof Error ? error_1.message : 'Unknown validation error'
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    StripeSchemaValidator.prototype.checkSchemaExists = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.client.rpc('check_schema_exists', {
                            schema_name: 'stripe'
                        })];
                    case 1:
                        _a = (_b.sent()), data = _a.data, error = _a.error;
                        if (error) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: "Schema check failed: ".concat(error.message)
                                }];
                        }
                        if (!data) {
                            return [2 /*return*/, { success: false, message: 'Stripe schema not found' }];
                        }
                        this.logger.log('SUCCESS: Stripe schema exists');
                        return [2 /*return*/, { success: true, message: 'Schema exists' }];
                }
            });
        });
    };
    StripeSchemaValidator.prototype.countStripeTables = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, tableCount;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.client.rpc('count_stripe_tables')];
                    case 1:
                        _a = (_b.sent()), data = _a.data, error = _a.error;
                        if (error) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: "Table count failed: ".concat(error.message)
                                }];
                        }
                        tableCount = parseInt(String(data), 10);
                        this.logger.log("STATS: Found ".concat(tableCount, " stripe tables"));
                        if (tableCount < 50) {
                            this.logger.warn("WARNING: Expected 90+ tables, found ".concat(tableCount));
                        }
                        else {
                            this.logger.log('SUCCESS: Good number of tables created');
                        }
                        return [2 /*return*/, { success: true, message: 'Tables counted', tableCount: tableCount }];
                }
            });
        });
    };
    StripeSchemaValidator.prototype.validateKeyTables = function () {
        return __awaiter(this, void 0, void 0, function () {
            var expectedTables, _a, data, error, tableRows, foundTables, missingTables, _i, expectedTables_1, table;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        expectedTables = [
                            'customers',
                            'subscriptions',
                            'invoices',
                            'prices',
                            'products',
                            'charges',
                            'payment_intents'
                        ];
                        return [4 /*yield*/, this.client.rpc('get_key_stripe_tables', {
                                table_names: expectedTables
                            })];
                    case 1:
                        _a = (_b.sent()), data = _a.data, error = _a.error;
                        if (error) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: "Key tables check failed: ".concat(error.message)
                                }];
                        }
                        tableRows = data;
                        foundTables = tableRows ? tableRows.map(function (row) { return row.table_name; }) : [];
                        missingTables = expectedTables.filter(function (table) { return !foundTables.includes(table); });
                        this.logger.log('KEY: Key tables found:');
                        for (_i = 0, expectedTables_1 = expectedTables; _i < expectedTables_1.length; _i++) {
                            table = expectedTables_1[_i];
                            if (foundTables.includes(table)) {
                                this.logger.log("  SUCCESS: ".concat(table));
                            }
                            else {
                                this.logger.log("  ERROR: ".concat(table, " (missing)"));
                            }
                        }
                        return [2 /*return*/, {
                                success: missingTables.length === 0,
                                message: missingTables.length > 0
                                    ? "Missing tables: ".concat(missingTables.join(', '))
                                    : 'All key tables found',
                                missingTables: missingTables
                            }];
                }
            });
        });
    };
    StripeSchemaValidator.prototype.checkCustomerCount = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, customerCount;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.client.rpc('count_stripe_customers')];
                    case 1:
                        _a = (_b.sent()), data = _a.data, error = _a.error;
                        if (error) {
                            this.logger.warn("Customer count check failed: ".concat(error.message));
                            return [2 /*return*/, { success: true, message: 'Customer count unavailable' }];
                        }
                        customerCount = parseInt(String(data), 10);
                        this.logger.log("USERS: Customers in database: ".concat(customerCount));
                        if (customerCount === 0) {
                            this.logger.log('SUCCESS: Database is empty as expected (0 users)');
                        }
                        return [2 /*return*/, { success: true, message: 'Customer count checked' }];
                }
            });
        });
    };
    return StripeSchemaValidator;
}());
var moduleLogger = new common_1.Logger('StripeSchemaValidation');
function validateStripeSchema() {
    return __awaiter(this, void 0, void 0, function () {
        var validator, result, error_2, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    moduleLogger.log('CHECKING: Validating Stripe schema creation...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    validator = new StripeSchemaValidator();
                    return [4 /*yield*/, validator.validateSchema()];
                case 2:
                    result = _a.sent();
                    if (result.success) {
                        moduleLogger.log("\nSUCCESS: ".concat(result.message));
                        if (result.tableCount) {
                            moduleLogger.log("  Total tables: ".concat(result.tableCount));
                        }
                    }
                    else {
                        moduleLogger.error("\nERROR: ".concat(result.message));
                        if (result.missingTables && result.missingTables.length > 0) {
                            moduleLogger.error("  Missing: ".concat(result.missingTables.join(', ')));
                        }
                        process.exit(1);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    message = error_2 instanceof Error ? error_2.message : 'Unknown error';
                    moduleLogger.error('FATAL:', message);
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
validateStripeSchema().catch(function (error) {
    moduleLogger.error('Fatal error:', error);
    process.exit(1);
});
