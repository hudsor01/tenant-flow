"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const setup_1 = require("./setup");
(0, globals_1.describe)('RLS: Tenant Isolation', () => {
    let tenantA;
    let tenantB;
    let serviceClient;
    const testData = {
        tenants: [],
        emergencyContacts: []
    };
    (0, globals_1.beforeAll)(async () => {
        tenantA = await (0, setup_1.authenticateAs)(setup_1.TEST_USERS.TENANT_A);
        tenantB = await (0, setup_1.authenticateAs)(setup_1.TEST_USERS.TENANT_B);
        serviceClient = (0, setup_1.getServiceRoleClient)();
        const tenantData = [
            {
                auth_user_id: tenantA.userId,
                userId: tenantA.userId,
                firstName: 'Test',
                lastName: 'Tenant A',
                email: tenantA.email,
                phone: '+1234567890',
                status: 'ACTIVE'
            },
            {
                auth_user_id: tenantB.userId,
                userId: tenantB.userId,
                firstName: 'Test',
                lastName: 'Tenant B',
                email: tenantB.email,
                phone: '+1234567891',
                status: 'ACTIVE'
            }
        ];
        for (const tenant of tenantData) {
            const { data, error } = await serviceClient
                .from('tenant')
                .insert(tenant)
                .select('id')
                .single();
            if (error) {
                console.error(`Failed to create tenant record for ${tenant.email}:`, error);
            }
            else if (data) {
                testData.tenants.push(data.id);
            }
        }
    });
    (0, globals_1.afterAll)(async () => {
        for (const id of testData.emergencyContacts) {
            await serviceClient.from('tenant_emergency_contact').delete().eq('id', id);
        }
    });
    (0, globals_1.describe)('Tenant Profile Access', () => {
        (0, globals_1.it)('tenant A can read their own profile', async () => {
            const { data, error } = await tenantA.client
                .from('tenant')
                .select('*')
                .eq('auth_user_id', tenantA.userId)
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
            (0, globals_1.expect)(data?.auth_user_id).toBe(tenantA.userId);
        });
        (0, globals_1.it)('tenant A cannot read tenant B profile', async () => {
            const { data, error } = await tenantA.client
                .from('tenant')
                .select('*')
                .eq('auth_user_id', tenantB.userId);
            (0, globals_1.expect)(error).toBeNull();
            (0, setup_1.expectEmptyResult)(data, 'tenant A querying tenant B profile');
        });
        (0, globals_1.it)('tenant A can update their own profile', async () => {
            const { data: tenantRecord } = await serviceClient
                .from('tenant')
                .select('id')
                .eq('auth_user_id', tenantA.userId)
                .single();
            if (!tenantRecord) {
                console.warn('Tenant A record not found - skipping update test');
                return;
            }
            const { data, error } = await tenantA.client
                .from('tenant')
                .update({ firstName: 'UpdatedName' })
                .eq('id', tenantRecord.id)
                .select()
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data?.firstName).toBe('UpdatedName');
            await serviceClient
                .from('tenant')
                .update({ firstName: 'Test' })
                .eq('id', tenantRecord.id);
        });
        (0, globals_1.it)('tenant A cannot update tenant B profile', async () => {
            const { data: tenantRecord } = await serviceClient
                .from('tenant')
                .select('id')
                .eq('auth_user_id', tenantB.userId)
                .single();
            if (!tenantRecord) {
                console.warn('Tenant B record not found - skipping test');
                return;
            }
            const { data, error } = await tenantA.client
                .from('tenant')
                .update({ firstName: 'Hacked' })
                .eq('id', tenantRecord.id)
                .select();
            if (error) {
                (0, setup_1.expectPermissionError)(error, 'tenant A updating tenant B');
            }
            else {
                (0, setup_1.expectEmptyResult)(data, 'tenant A updating tenant B');
            }
        });
    });
    (0, globals_1.describe)('Emergency Contact Isolation', () => {
        let tenantAId;
        let tenantBId;
        let tenantAEmergencyContactId;
        (0, globals_1.beforeAll)(async () => {
            const { data: tenantARecord } = await serviceClient
                .from('tenant')
                .select('id')
                .eq('auth_user_id', tenantA.userId)
                .single();
            const { data: tenantBRecord } = await serviceClient
                .from('tenant')
                .select('id')
                .eq('auth_user_id', tenantB.userId)
                .single();
            if (tenantARecord)
                tenantAId = tenantARecord.id;
            if (tenantBRecord)
                tenantBId = tenantBRecord.id;
            if (tenantAId) {
                const { data } = await serviceClient
                    .from('tenant_emergency_contact')
                    .insert({
                    tenant_id: tenantAId,
                    contact_name: 'John Emergency',
                    relationship: 'Father',
                    phone_number: '+1234567890',
                    email: 'emergency@test.com'
                })
                    .select()
                    .single();
                if (data) {
                    tenantAEmergencyContactId = data.id;
                    testData.emergencyContacts.push(data.id);
                }
            }
        });
        (0, globals_1.it)('tenant A can read their own emergency contact', async () => {
            if (!tenantAId) {
                console.warn('Tenant A ID not found - skipping test');
                return;
            }
            const { data, error } = await tenantA.client
                .from('tenant_emergency_contact')
                .select('*')
                .eq('tenant_id', tenantAId)
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
            (0, globals_1.expect)(data?.tenant_id).toBe(tenantAId);
        });
        (0, globals_1.it)('tenant B cannot read tenant A emergency contact', async () => {
            if (!tenantAId) {
                console.warn('Tenant A ID not found - skipping test');
                return;
            }
            const { data, error } = await tenantB.client
                .from('tenant_emergency_contact')
                .select('*')
                .eq('tenant_id', tenantAId);
            (0, globals_1.expect)(error).toBeNull();
            (0, setup_1.expectEmptyResult)(data, 'tenant B querying tenant A emergency contact');
        });
        (0, globals_1.it)('tenant A can create their own emergency contact', async () => {
            if (!tenantAId) {
                console.warn('Tenant A ID not found - skipping test');
                return;
            }
            await serviceClient
                .from('tenant_emergency_contact')
                .delete()
                .eq('tenant_id', tenantAId);
            const { data, error } = await tenantA.client
                .from('tenant_emergency_contact')
                .insert({
                tenant_id: tenantAId,
                contact_name: 'Jane Emergency',
                relationship: 'Mother',
                phone_number: '+1987654321'
            })
                .select()
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
            if (data) {
                tenantAEmergencyContactId = data.id;
                testData.emergencyContacts.push(data.id);
            }
        });
        (0, globals_1.it)('tenant A cannot create emergency contact for tenant B', async () => {
            if (!tenantBId) {
                console.warn('Tenant B ID not found - skipping test');
                return;
            }
            const { data, error } = await tenantA.client
                .from('tenant_emergency_contact')
                .insert({
                tenant_id: tenantBId,
                contact_name: 'Hacker Contact',
                relationship: 'None',
                phone_number: '+1111111111'
            })
                .select();
            (0, setup_1.expectPermissionError)(error, 'tenant A creating contact for tenant B');
            (0, globals_1.expect)(data).toBeNull();
        });
        (0, globals_1.it)('tenant A can update their own emergency contact', async () => {
            if (!tenantAId || !tenantAEmergencyContactId) {
                console.warn('Test data not available - skipping test');
                return;
            }
            const { data, error } = await tenantA.client
                .from('tenant_emergency_contact')
                .update({ phone_number: '+1555555555' })
                .eq('id', tenantAEmergencyContactId)
                .select()
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data?.phone_number).toBe('+1555555555');
        });
        (0, globals_1.it)('tenant A cannot update tenant B emergency contact', async () => {
            if (!tenantBId) {
                console.warn('Tenant B ID not found - skipping test');
                return;
            }
            const { data: tenantBContact } = await serviceClient
                .from('tenant_emergency_contact')
                .insert({
                tenant_id: tenantBId,
                contact_name: 'Tenant B Contact',
                relationship: 'Sibling',
                phone_number: '+1222222222'
            })
                .select()
                .single();
            if (!tenantBContact) {
                console.warn('Failed to create tenant B contact - skipping test');
                return;
            }
            testData.emergencyContacts.push(tenantBContact.id);
            const { data, error } = await tenantA.client
                .from('tenant_emergency_contact')
                .update({ phone_number: '+1999999999' })
                .eq('id', tenantBContact.id)
                .select();
            if (error) {
                (0, setup_1.expectPermissionError)(error, 'tenant A updating tenant B emergency contact');
            }
            else {
                (0, setup_1.expectEmptyResult)(data, 'tenant A updating tenant B emergency contact');
            }
        });
        (0, globals_1.it)('tenant A can delete their own emergency contact', async () => {
            if (!tenantAId || !tenantAEmergencyContactId) {
                console.warn('Test data not available - skipping test');
                return;
            }
            const { error } = await tenantA.client
                .from('tenant_emergency_contact')
                .delete()
                .eq('id', tenantAEmergencyContactId);
            (0, globals_1.expect)(error).toBeNull();
            testData.emergencyContacts = testData.emergencyContacts.filter(id => id !== tenantAEmergencyContactId);
        });
        (0, globals_1.it)('tenant A cannot delete tenant B emergency contact', async () => {
            const { data: contacts } = await serviceClient
                .from('tenant_emergency_contact')
                .select('id')
                .eq('tenant_id', tenantBId)
                .limit(1);
            if (!contacts || contacts.length === 0) {
                console.warn('Tenant B has no emergency contact - skipping test');
                return;
            }
            const contactId = contacts[0]?.id;
            if (!contactId) {
                console.warn('Contact ID is undefined - skipping test');
                return;
            }
            const { data, error } = await tenantA.client
                .from('tenant_emergency_contact')
                .delete()
                .eq('id', contactId)
                .select();
            if (error) {
                (0, setup_1.expectPermissionError)(error, 'tenant A deleting tenant B emergency contact');
            }
            else {
                (0, setup_1.expectEmptyResult)(data, 'tenant A deleting tenant B emergency contact');
            }
        });
    });
    (0, globals_1.describe)('Notification Preferences Isolation', () => {
        (0, globals_1.it)('tenant A can read their own notification preferences', async () => {
            const { data: tenantRecord } = await serviceClient
                .from('tenant')
                .select('id, notification_preferences')
                .eq('auth_user_id', tenantA.userId)
                .single();
            if (!tenantRecord) {
                console.warn('Tenant A record not found - skipping test');
                return;
            }
            const { data, error } = await tenantA.client
                .from('tenant')
                .select('notification_preferences')
                .eq('id', tenantRecord.id)
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
        });
        (0, globals_1.it)('tenant A cannot read tenant B notification preferences', async () => {
            const { data: tenantRecord } = await serviceClient
                .from('tenant')
                .select('id')
                .eq('auth_user_id', tenantB.userId)
                .single();
            if (!tenantRecord) {
                console.warn('Tenant B record not found - skipping test');
                return;
            }
            const { data, error } = await tenantA.client
                .from('tenant')
                .select('notification_preferences')
                .eq('id', tenantRecord.id);
            (0, globals_1.expect)(error).toBeNull();
            (0, setup_1.expectEmptyResult)(data, 'tenant A querying tenant B notification preferences');
        });
    });
});
//# sourceMappingURL=tenant-isolation.integration.spec.js.map