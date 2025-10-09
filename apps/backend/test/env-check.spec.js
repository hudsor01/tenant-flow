"use strict";
/**
 * Test to verify environment variables are accessible
 * Following CLAUDE.md: NO ABSTRACTIONS, simple direct checks
 */
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("@nestjs/common");
var testLogger = new common_1.Logger('EnvCheck');
describe('Environment Variables Access', function () {
    it('should access SUPABASE_URL from environment', function () {
        testLogger.log('SUPABASE_URL:', process.env.SUPABASE_URL);
        // Direct environment variable check - no abstractions
        expect(process.env.SUPABASE_URL).toBeDefined();
        expect(process.env.SUPABASE_URL).toMatch(/^https?:\/\//);
    });
    it('should access SUPABASE_SERVICE_ROLE_KEY from environment', function () {
        var _a;
        testLogger.log('SUPABASE_SERVICE_ROLE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
        testLogger.log('First 20 chars:', (_a = process.env.SUPABASE_SERVICE_ROLE_KEY) === null || _a === void 0 ? void 0 : _a.substring(0, 20));
        expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
        // Should be a JWT token or demo value
        expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toMatch(/^(eyJ|demo-service-key)/);
    });
    it('should check SUPABASE_ANON_KEY availability', function () {
        testLogger.log('SUPABASE_ANON_KEY available:', !!process.env.SUPABASE_ANON_KEY);
        // SUPABASE_ANON_KEY may not be in all environments - that's OK
        if (process.env.SUPABASE_ANON_KEY) {
            // Accept both JWT format and demo keys for testing
            var isValidFormat = process.env.SUPABASE_ANON_KEY.match(/^eyJ/) || process.env.SUPABASE_ANON_KEY.includes('demo');
            expect(isValidFormat).toBeTruthy();
            testLogger.log('SUPABASE_ANON_KEY is properly formatted (JWT or demo key)');
        }
        else {
            testLogger.log('SUPABASE_ANON_KEY not set - using fallback in tests');
        }
    });
    it('should show environment status', function () {
        testLogger.log('\n=== ENVIRONMENT STATUS ===');
        testLogger.log('SUPABASE_URL:', process.env.SUPABASE_URL);
        testLogger.log('SUPABASE_ANON_KEY:', !!process.env.SUPABASE_ANON_KEY);
        testLogger.log('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
        testLogger.log('STRIPE_SECRET_KEY:', !!process.env.STRIPE_SECRET_KEY, '(optional)');
        testLogger.log('DATABASE_URL:', !!process.env.DATABASE_URL, '(optional)');
    });
});
