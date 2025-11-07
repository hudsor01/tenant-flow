"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const setup_1 = require("./setup");
(0, globals_1.describe)('RLS: Payment Isolation', () => {
    let ownerA;
    let ownerB;
    let tenantA;
    let tenantB;
    let serviceClient;
    let testLeaseId;
    const testData = {
        properties: [],
        tenants: [],
        leases: [],
        payments: []
    };
    (0, globals_1.beforeAll)(async () => {
        ownerA = await (0, setup_1.authenticateAs)(setup_1.TEST_USERS.owner_A);
        ownerB = await (0, setup_1.authenticateAs)(setup_1.TEST_USERS.owner_B);
        tenantA = await (0, setup_1.authenticateAs)(setup_1.TEST_USERS.TENANT_A);
        tenantB = await (0, setup_1.authenticateAs)(setup_1.TEST_USERS.TENANT_B);
        serviceClient = (0, setup_1.getServiceRoleClient)();
        testLeaseId = await (0, setup_1.ensureTestLease)(ownerA.userId, tenantA.userId);
    });
    (0, globals_1.describe)('SELECT Policy: Owner/Tenant Access', () => {
        (0, globals_1.it)('owner A can only see their own property payments', async () => {
            const { data, error } = await ownerA.client
                .from('rent_payment')
                .select('*');
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
            if (data && data.length > 0) {
                for (const payment of data) {
                    (0, globals_1.expect)(payment.ownerId).toBe(ownerA.userId);
                }
            }
        });
        (0, globals_1.it)('owner A cannot see owner B payments', async () => {
            const { data, error } = await ownerA.client
                .from('rent_payment')
                .select('*')
                .eq('ownerId', ownerB.userId);
            (0, globals_1.expect)(error).toBeNull();
            (0, setup_1.expectEmptyResult)(data, 'owner A querying owner B payments');
        });
        (0, globals_1.it)('tenant A can only see their own payments', async () => {
            const { data, error } = await tenantA.client
                .from('rent_payment')
                .select('*');
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
            if (data && data.length > 0) {
                for (const payment of data) {
                    (0, globals_1.expect)(payment.tenantId).toBe(tenantA.userId);
                }
            }
        });
        (0, globals_1.it)('tenant A cannot see tenant B payments', async () => {
            const { data, error } = await tenantA.client
                .from('rent_payment')
                .select('*')
                .eq('tenantId', tenantB.userId);
            (0, globals_1.expect)(error).toBeNull();
            (0, setup_1.expectEmptyResult)(data, 'tenant A querying tenant B payments');
        });
        (0, globals_1.it)('tenant cannot see owner payments for other properties', async () => {
            const { data, error } = await tenantA.client
                .from('rent_payment')
                .select('*')
                .eq('ownerId', ownerB.userId);
            (0, globals_1.expect)(error).toBeNull();
            (0, setup_1.expectEmptyResult)(data, 'tenant querying other owner payments');
        });
    });
    (0, globals_1.describe)('INSERT Policy: Service Role Only', () => {
        (0, globals_1.it)('authenticated user (owner) CANNOT insert payments', async () => {
            const { data, error } = await ownerA.client
                .from('rent_payment')
                .insert({
                ownerId: ownerA.userId,
                tenantId: tenantA.userId,
                amount: 150000,
                status: 'pending',
                dueDate: new Date().toISOString().split('T')[0] || null,
                leaseId: testLeaseId,
                ownerReceives: 142500,
                paymentType: 'card',
                platformFee: 7500,
                stripeFee: 0
            })
                .select();
            (0, setup_1.expectPermissionError)(error, 'owner attempting to insert payment');
            (0, globals_1.expect)(data).toBeNull();
        });
        (0, globals_1.it)('authenticated user (tenant) CANNOT insert payments', async () => {
            const { data, error } = await tenantA.client
                .from('rent_payment')
                .insert({
                ownerId: ownerB.userId,
                tenantId: tenantA.userId,
                amount: 150000,
                status: 'pending',
                dueDate: new Date().toISOString().split('T')[0] || null,
                leaseId: testLeaseId,
                ownerReceives: 142500,
                paymentType: 'card',
                platformFee: 7500,
                stripeFee: 0
            })
                .select();
            (0, setup_1.expectPermissionError)(error, 'tenant attempting to insert payment');
            (0, globals_1.expect)(data).toBeNull();
        });
        (0, globals_1.it)('service role CAN insert payments', async () => {
            const testPayment = {
                ownerId: ownerA.userId,
                tenantId: tenantA.userId,
                amount: 150000,
                status: 'pending',
                dueDate: new Date().toISOString().split('T')[0] || null,
                leaseId: testLeaseId,
                ownerReceives: 142500,
                paymentType: 'card',
                platformFee: 7500,
                stripeFee: 0
            };
            const { data, error } = await serviceClient
                .from('rent_payment')
                .insert(testPayment)
                .select()
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
            (0, globals_1.expect)(data?.amount).toBe(150000);
            if (data) {
                testData.payments.push(data.id);
            }
        });
    });
    (0, globals_1.describe)('UPDATE Policy: Service Role Only', () => {
        let testPaymentId;
        (0, globals_1.beforeAll)(async () => {
            const { data } = await serviceClient
                .from('rent_payment')
                .insert({
                ownerId: ownerA.userId,
                tenantId: tenantA.userId,
                amount: 150000,
                status: 'pending',
                dueDate: new Date().toISOString().split('T')[0] || null,
                leaseId: testLeaseId,
                ownerReceives: 142500,
                paymentType: 'card',
                platformFee: 7500,
                stripeFee: 0
            })
                .select()
                .single();
            if (data) {
                testPaymentId = data.id;
                testData.payments.push(data.id);
            }
        });
        (0, globals_1.it)('authenticated user (owner) CANNOT update payments', async () => {
            const { data, error } = await ownerA.client
                .from('rent_payment')
                .update({ status: 'succeeded' })
                .eq('id', testPaymentId)
                .select();
            (0, setup_1.expectPermissionError)(error, 'owner attempting to update payment');
            (0, globals_1.expect)(data).toBeNull();
        });
        (0, globals_1.it)('authenticated user (tenant) CANNOT update payments', async () => {
            const { data, error } = await tenantA.client
                .from('rent_payment')
                .update({ status: 'succeeded' })
                .eq('id', testPaymentId)
                .select();
            (0, setup_1.expectPermissionError)(error, 'tenant attempting to update payment');
            (0, globals_1.expect)(data).toBeNull();
        });
        (0, globals_1.it)('service role CAN update payments', async () => {
            const { data, error } = await serviceClient
                .from('rent_payment')
                .update({ status: 'succeeded', paidAt: new Date().toISOString() })
                .eq('id', testPaymentId)
                .select()
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
            (0, globals_1.expect)(data?.status).toBe('succeeded');
        });
    });
    (0, globals_1.describe)('DELETE Policy: None (7-Year Retention)', () => {
        let testPaymentId;
        (0, globals_1.beforeAll)(async () => {
            const { data } = await serviceClient
                .from('rent_payment')
                .insert({
                ownerId: ownerA.userId,
                tenantId: tenantA.userId,
                amount: 150000,
                status: 'pending',
                dueDate: new Date().toISOString().split('T')[0] || null,
                leaseId: testLeaseId,
                ownerReceives: 142500,
                paymentType: 'card',
                platformFee: 7500,
                stripeFee: 0
            })
                .select()
                .single();
            if (data) {
                testPaymentId = data.id;
                testData.payments.push(data.id);
            }
        });
        (0, globals_1.it)('authenticated user (owner) CANNOT delete payments', async () => {
            const { data, error } = await ownerA.client
                .from('rent_payment')
                .delete()
                .eq('id', testPaymentId);
            (0, setup_1.expectPermissionError)(error, 'owner attempting to delete payment');
            (0, globals_1.expect)(data).toBeNull();
        });
        (0, globals_1.it)('authenticated user (tenant) CANNOT delete payments', async () => {
            const { data, error } = await tenantA.client
                .from('rent_payment')
                .delete()
                .eq('id', testPaymentId);
            (0, setup_1.expectPermissionError)(error, 'tenant attempting to delete payment');
            (0, globals_1.expect)(data).toBeNull();
        });
        (0, globals_1.it)('service role CAN delete payments (cleanup only)', async () => {
            const { error } = await serviceClient
                .from('rent_payment')
                .delete()
                .eq('id', testPaymentId);
            (0, globals_1.expect)(error).toBeNull();
            testData.payments = testData.payments.filter(id => id !== testPaymentId);
        });
    });
    (0, globals_1.describe)('Cross-Tenant Payment Spoofing Prevention', () => {
        (0, globals_1.it)('tenant cannot create payment with another tenant ID', async () => {
            const { data, error } = await tenantA.client
                .from('rent_payment')
                .insert({
                ownerId: ownerA.userId,
                tenantId: tenantB.userId,
                amount: 150000,
                status: 'pending',
                dueDate: new Date().toISOString().split('T')[0] || null,
                leaseId: testLeaseId,
                ownerReceives: 142500,
                paymentType: 'card',
                platformFee: 7500,
                stripeFee: 0
            })
                .select();
            (0, setup_1.expectPermissionError)(error, 'tenant spoofing another tenant ID');
            (0, globals_1.expect)(data).toBeNull();
        });
        (0, globals_1.it)('owner cannot create payment for another owner', async () => {
            const { data, error } = await ownerA.client
                .from('rent_payment')
                .insert({
                ownerId: ownerB.userId,
                tenantId: tenantA.userId,
                amount: 150000,
                status: 'pending',
                dueDate: new Date().toISOString().split('T')[0] || null,
                leaseId: testLeaseId,
                ownerReceives: 142500,
                paymentType: 'card',
                platformFee: 7500,
                stripeFee: 0
            })
                .select();
            (0, setup_1.expectPermissionError)(error, 'owner spoofing another owner ID');
            (0, globals_1.expect)(data).toBeNull();
        });
    });
});
//# sourceMappingURL=payment-isolation.integration.spec.js.map