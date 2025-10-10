#!/usr/bin/env ts-node
"use strict";
/**
 * RLS Security Audit Script Wrapper
 * Wrapper that calls the main RLS audit script from the root directory
 */
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("@nestjs/common");
var child_process_1 = require("child_process");
var path = require("path");
var rlsAuditLogger = new common_1.Logger('RLSAudit');
// Skip in CI environment
if (process.env.CI || process.env.GITHUB_ACTIONS || process.env.RUNNER_OS) {
    rlsAuditLogger.log('Running in CI environment - skipping RLS security audit');
    rlsAuditLogger.log('SUCCESS: RLS security audit skipped in CI (database connection not available)');
    process.exit(0);
}
// In non-CI environments, delegate to the main script
var mainScript = path.join(__dirname, '../../../scripts/audit-rls-security.js');
var child = (0, child_process_1.spawn)('node', [mainScript], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '../../..')
});
child.on('exit', function (code) {
    process.exit(code || 0);
});
