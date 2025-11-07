"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_USERS = void 0;
exports.authenticateAs = authenticateAs;
exports.getServiceRoleClient = getServiceRoleClient;
exports.cleanupTestData = cleanupTestData;
exports.expectEmptyResult = expectEmptyResult;
exports.expectPermissionError = expectPermissionError;
exports.ensureTestLease = ensureTestLease;
const supabase_js_1 = require("@supabase/supabase-js");
exports.TEST_USERS = {
    owner_A: {
        email: process.env.E2E_owner_A_EMAIL || 'owner-a@test.tenantflow.local',
        password: process.env.E2E_owner_A_PASSWORD || 'TestPassword123!',
        role: 'owner'
    },
    owner_B: {
        email: process.env.E2E_owner_B_EMAIL || 'owner-b@test.tenantflow.local',
        password: process.env.E2E_owner_B_PASSWORD || 'TestPassword123!',
        role: 'owner'
    },
    TENANT_A: {
        email: process.env.E2E_TENANT_A_EMAIL || 'tenant-a@test.tenantflow.local',
        password: process.env.E2E_TENANT_A_PASSWORD || 'TestPassword123!',
        role: 'TENANT'
    },
    TENANT_B: {
        email: process.env.E2E_TENANT_B_EMAIL || 'tenant-b@test.tenantflow.local',
        password: process.env.E2E_TENANT_B_PASSWORD || 'TestPassword123!',
        role: 'TENANT'
    }
};
function createTestClient() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in environment.');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    });
}
async function authenticateAs(credentials) {
    const client = createTestClient();
    const authData = await client.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
    });
    if (authData.error || !authData.data.session) {
        throw new Error(`Failed to authenticate as ${credentials.email}: ${authData.error?.message || 'No session'}`);
    }
    const serviceClient = getServiceRoleClient();
    const authUserId = authData.data.user.id;
    if (serviceClient) {
        const { data: existingUser } = await serviceClient
            .from('users')
            .select('id, supabaseId')
            .eq('id', authData.data.user.id)
            .maybeSingle();
        if (!existingUser) {
            const { error: userError } = await serviceClient.from('users').insert({
                id: authData.data.user.id,
                supabaseId: authData.data.user.id,
                email: authData.data.user.email,
                firstName: credentials.role === 'owner' ? 'Owner' : 'Tenant',
                lastName: 'Test',
                role: credentials.role === 'owner' ? 'OWNER' : 'TENANT'
            });
            if (userError && !userError.message.includes('duplicate key')) {
                throw new Error(`Failed to create user record for ${credentials.email}: ${userError.message} (code: ${userError.code})`);
            }
        }
    }
    return {
        client,
        userId: authUserId,
        email: authData.data.user.email,
        role: credentials.role,
        accessToken: authData.data.session.access_token
    };
}
function getServiceRoleClient() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing service role credentials (SUPABASE_URL and SUPABASE_SECRET_KEY). Cannot run tests.');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        db: {
            schema: 'public'
        }
    });
}
async function cleanupTestData(serviceClient, resourceIds) {
    if (resourceIds.payments) {
        for (const id of resourceIds.payments) {
            await serviceClient.from('rent_payment').delete().eq('id', id);
        }
    }
    if (resourceIds.leases) {
        for (const id of resourceIds.leases) {
            await serviceClient.from('lease').delete().eq('id', id);
        }
    }
    if (resourceIds.tenants) {
        for (const id of resourceIds.tenants) {
            await serviceClient.from('tenant').delete().eq('id', id);
        }
    }
    if (resourceIds.units) {
        for (const id of resourceIds.units) {
            await serviceClient.from('unit').delete().eq('id', id);
        }
    }
    if (resourceIds.properties) {
        for (const id of resourceIds.properties) {
            await serviceClient.from('property').delete().eq('id', id);
        }
    }
}
function expectEmptyResult(data, context) {
    if (data === null || data.length === 0) {
        return;
    }
    throw new Error(`Expected empty result for ${context}, but got ${data.length} rows. RLS policy may be broken!`);
}
function expectPermissionError(error, context) {
    if (!error) {
        throw new Error(`Expected permission error for ${context}, but query succeeded. RLS policy may be broken!`);
    }
    const permissionErrors = [
        'PGRST301',
        '42501',
        '42P01'
    ];
    const errorCode = error.code || error.error_code || '';
    const errorMessage = error.message || '';
    if (permissionErrors.some(code => errorCode.includes(code)) ||
        errorMessage.toLowerCase().includes('permission') ||
        errorMessage.toLowerCase().includes('policy')) {
        return;
    }
    throw new Error(`Expected permission error for ${context}, but got: ${errorMessage} (${errorCode})`);
}
async function ensureTestLease(ownerId, tenantId) {
    const serviceClient = getServiceRoleClient();
    if (!serviceClient) {
        throw new Error('Service role client not available');
    }
    const testLeaseId = 'test-lease-for-payments';
    const testPropertyId = 'test-property-for-payments';
    const testUnitId = 'test-unit-for-payments';
    const { data: existing } = await serviceClient
        .from('lease')
        .select('id')
        .eq('id', testLeaseId)
        .maybeSingle();
    if (existing) {
        return testLeaseId;
    }
    const { error: propertyError } = await serviceClient.from('property').upsert({
        id: testPropertyId,
        ownerId,
        name: 'Test Property',
        address: '123 Test St',
        city: 'Test City',
        state: 'CA',
        zipCode: '12345',
        propertyType: 'SINGLE_FAMILY',
        status: 'ACTIVE'
    });
    if (propertyError && !propertyError.message.includes('duplicate key')) {
        throw new Error(`Failed to create test property: ${propertyError.message}`);
    }
    const { error: unitError } = await serviceClient.from('unit').upsert({
        id: testUnitId,
        propertyId: testPropertyId,
        unitNumber: '1',
        rent: 150000,
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 500,
        status: 'OCCUPIED'
    });
    if (unitError && !unitError.message.includes('duplicate key')) {
        throw new Error(`Failed to create test unit: ${unitError.message}`);
    }
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    const testTenantRecordId = 'test-tenant-record-for-payments';
    const { error: tenantRecordError } = await serviceClient
        .from('tenant')
        .upsert({
        id: testTenantRecordId,
        userId: tenantId,
        email: 'test-tenant@test.tenantflow.local',
        firstName: 'Test',
        lastName: 'Tenant',
        status: 'ACTIVE'
    });
    if (tenantRecordError &&
        !tenantRecordError.message.includes('duplicate key')) {
        throw new Error(`Failed to create tenant record: ${tenantRecordError.message}`);
    }
    const { error } = await serviceClient.from('lease').insert({
        id: testLeaseId,
        tenantId: testTenantRecordId,
        unitId: testUnitId,
        rentAmount: 150000,
        securityDeposit: 150000,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        status: 'ACTIVE'
    });
    if (error) {
        throw new Error(`Failed to create test lease: ${error.message}`);
    }
    return testLeaseId;
}
//# sourceMappingURL=setup.js.map