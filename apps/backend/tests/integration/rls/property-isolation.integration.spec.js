"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const setup_1 = require("./setup");
(0, globals_1.describe)('RLS: Property Isolation', () => {
    let ownerA;
    let ownerB;
    let tenantA;
    let serviceClient;
    const testData = {
        properties: [],
        units: []
    };
    (0, globals_1.beforeAll)(async () => {
        ownerA = await (0, setup_1.authenticateAs)(setup_1.TEST_USERS.OWNER_A);
        ownerB = await (0, setup_1.authenticateAs)(setup_1.TEST_USERS.OWNER_B);
        tenantA = await (0, setup_1.authenticateAs)(setup_1.TEST_USERS.TENANT_A);
        serviceClient = (0, setup_1.getServiceRoleClient)();
    });
    (0, globals_1.afterAll)(async () => {
        // Cleanup in correct order: units first (foreign key), then properties
        for (const id of testData.units) {
            await serviceClient.from('unit').delete().eq('id', id);
        }
        for (const id of testData.properties) {
            await serviceClient.from('property').delete().eq('id', id);
        }
    });
    (0, globals_1.describe)('Property Ownership Access', () => {
        let ownerAPropertyId;
        let ownerBPropertyId;
        (0, globals_1.beforeAll)(async () => {
            const { data: propertyA } = await serviceClient
                .from('property')
                .select('id')
                .eq('ownerId', ownerA.userId)
                .limit(1)
                .single();
            const { data: propertyB } = await serviceClient
                .from('property')
                .select('id')
                .eq('ownerId', ownerB.userId)
                .limit(1)
                .single();
            if (propertyA)
                ownerAPropertyId = propertyA.id;
            if (propertyB)
                ownerBPropertyId = propertyB.id;
        });
        (0, globals_1.it)('owner A can read their own properties', async () => {
            const { data, error } = await ownerA.client
                .from('property')
                .select('*')
                .eq('ownerId', ownerA.userId);
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
            (0, globals_1.expect)(Array.isArray(data)).toBe(true);
            if (data && data.length > 0) {
                for (const property of data) {
                    (0, globals_1.expect)(property.ownerId).toBe(ownerA.userId);
                }
            }
        });
        (0, globals_1.it)('owner A cannot read owner B properties', async () => {
            if (!ownerBPropertyId) {
                console.warn('owner B has no properties - skipping test');
                return;
            }
            const { data, error } = await ownerA.client
                .from('property')
                .select('*')
                .eq('id', ownerBPropertyId);
            (0, globals_1.expect)(error).toBeNull();
            (0, setup_1.expectEmptyResult)(data, 'owner A querying owner B property');
        });
        (0, globals_1.it)('owner A can update their own property', async () => {
            if (!ownerAPropertyId) {
                console.warn('owner A has no properties - skipping test');
                return;
            }
            const { data, error } = await ownerA.client
                .from('property')
                .update({ name: `Updated Property ${Date.now()}` })
                .eq('id', ownerAPropertyId)
                .select()
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
        });
        (0, globals_1.it)('owner A cannot update owner B property', async () => {
            if (!ownerBPropertyId) {
                console.warn('owner B has no properties - skipping test');
                return;
            }
            const { data, error } = await ownerA.client
                .from('property')
                .update({ name: 'Hacked Property' })
                .eq('id', ownerBPropertyId)
                .select();
            if (error) {
                (0, setup_1.expectPermissionError)(error, 'owner A updating owner B property');
            }
            else {
                (0, setup_1.expectEmptyResult)(data, 'owner A updating owner B property');
            }
        });
        (0, globals_1.it)('tenant cannot read property management data', async () => {
            if (!ownerAPropertyId) {
                console.warn('owner A has no properties - skipping test');
                return;
            }
            const { data, error } = await tenantA.client
                .from('property')
                .select('*')
                .eq('id', ownerAPropertyId);
            (0, globals_1.expect)(error).toBeNull();
            (0, setup_1.expectEmptyResult)(data, 'tenant querying property management data');
        });
        (0, globals_1.it)('tenant cannot list all properties', async () => {
            const { data, error } = await tenantA.client.from('property').select('*');
            (0, globals_1.expect)(error).toBeNull();
            (0, setup_1.expectEmptyResult)(data, 'tenant listing all properties');
        });
    });
    (0, globals_1.describe)('Property Creation', () => {
        (0, globals_1.it)('owner A can create property', async () => {
            const newProperty = {
                name: `TEST Property ${Date.now()}`,
                propertyType: 'SINGLE_FAMILY',
                address: '123 Test St',
                city: 'Test City',
                state: 'TS',
                zipCode: '12345',
                ownerId: ownerA.userId
            };
            const { data, error } = await ownerA.client
                .from('property')
                .insert(newProperty)
                .select()
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
            (0, globals_1.expect)(data?.ownerId).toBe(ownerA.userId);
            if (data) {
                testData.properties.push(data.id);
            }
        });
        (0, globals_1.it)('owner A cannot create property for owner B', async () => {
            const maliciousProperty = {
                name: 'Spoofed Property',
                propertyType: 'APARTMENT',
                ownerId: ownerB.userId,
                address: '123 Fake St',
                city: 'Fake City',
                state: 'CA',
                zipCode: '12345'
            };
            const { data, error } = await ownerA.client
                .from('property')
                .insert(maliciousProperty)
                .select();
            (0, setup_1.expectPermissionError)(error, 'owner A creating property for owner B');
            (0, globals_1.expect)(data).toBeNull();
        });
        (0, globals_1.it)('tenant cannot create property', async () => {
            const property = {
                name: 'Tenant Spoofed Property',
                propertyType: 'CONDO',
                ownerId: tenantA.userId,
                address: '456 Fake Ave',
                city: 'Fake City',
                state: 'CA',
                zipCode: '12345'
            };
            const { data, error } = await tenantA.client
                .from('property')
                .insert(property)
                .select();
            (0, setup_1.expectPermissionError)(error, 'tenant creating property');
            (0, globals_1.expect)(data).toBeNull();
        });
    });
    (0, globals_1.describe)('Unit Isolation', () => {
        let ownerAPropertyId;
        let ownerAUnitId;
        let ownerBPropertyId;
        let ownerBUnitId;
        (0, globals_1.beforeAll)(async () => {
            const { data: propertyA } = await serviceClient
                .from('property')
                .select('id')
                .eq('ownerId', ownerA.userId)
                .limit(1)
                .single();
            if (propertyA) {
                ownerAPropertyId = propertyA.id;
                const { data: unitA } = await serviceClient
                    .from('unit')
                    .select('id')
                    .eq('propertyId', propertyA.id)
                    .limit(1)
                    .single();
                if (unitA)
                    ownerAUnitId = unitA.id;
            }
            const { data: propertyB } = await serviceClient
                .from('property')
                .select('id')
                .eq('ownerId', ownerB.userId)
                .limit(1)
                .single();
            if (propertyB) {
                ownerBPropertyId = propertyB.id;
                const { data: unitB } = await serviceClient
                    .from('unit')
                    .select('id')
                    .eq('propertyId', propertyB.id)
                    .limit(1)
                    .single();
                if (unitB)
                    ownerBUnitId = unitB.id;
            }
        });
        (0, globals_1.it)('owner A can read units in their own property', async () => {
            if (!ownerAPropertyId) {
                console.warn('owner A has no properties - skipping test');
                return;
            }
            const { data, error } = await ownerA.client
                .from('unit')
                .select('*')
                .eq('propertyId', ownerAPropertyId);
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
        });
        (0, globals_1.it)('owner A cannot read units in owner B property', async () => {
            if (!ownerBPropertyId) {
                console.warn('owner B has no properties - skipping test');
                return;
            }
            const { data, error } = await ownerA.client
                .from('unit')
                .select('*')
                .eq('propertyId', ownerBPropertyId);
            (0, globals_1.expect)(error).toBeNull();
            (0, setup_1.expectEmptyResult)(data, 'owner A querying units in owner B property');
        });
        (0, globals_1.it)('owner A can create unit in their own property', async () => {
            if (!ownerAPropertyId) {
                console.warn('owner A has no properties - skipping test');
                return;
            }
            const newUnit = {
                propertyId: ownerAPropertyId,
                unitNumber: `TEST-${Date.now()}`,
                bedrooms: 2,
                bathrooms: 1,
                rent: 1500,
                status: 'VACANT'
            };
            const { data, error } = await ownerA.client
                .from('unit')
                .insert(newUnit)
                .select()
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
            if (data) {
                testData.units.push(data.id);
            }
        });
        (0, globals_1.it)('owner A cannot create unit in owner B property', async () => {
            if (!ownerBPropertyId) {
                console.warn('owner B has no properties - skipping test');
                return;
            }
            const maliciousUnit = {
                propertyId: ownerBPropertyId,
                unitNumber: 'HACKED-UNIT',
                bedrooms: 1,
                bathrooms: 1,
                rent: 1200,
                status: 'VACANT'
            };
            const { data, error } = await ownerA.client
                .from('unit')
                .insert(maliciousUnit)
                .select();
            (0, setup_1.expectPermissionError)(error, 'owner A creating unit in owner B property');
            (0, globals_1.expect)(data).toBeNull();
        });
        (0, globals_1.it)('owner A can update unit in their own property', async () => {
            if (!ownerAUnitId) {
                console.warn('owner A has no units - skipping test');
                return;
            }
            const { data, error } = await ownerA.client
                .from('unit')
                .update({ bedrooms: 3 })
                .eq('id', ownerAUnitId)
                .select()
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
            (0, globals_1.expect)(data?.bedrooms).toBe(3);
        });
        (0, globals_1.it)('owner A cannot update unit in owner B property', async () => {
            if (!ownerBUnitId) {
                console.warn('owner B has no units - skipping test');
                return;
            }
            const { data, error } = await ownerA.client
                .from('unit')
                .update({ bedrooms: 99 })
                .eq('id', ownerBUnitId)
                .select();
            if (error) {
                (0, setup_1.expectPermissionError)(error, 'owner A updating unit in owner B property');
            }
            else {
                (0, setup_1.expectEmptyResult)(data, 'owner A updating unit in owner B property');
            }
        });
    });
    (0, globals_1.describe)('Property Status Transitions', () => {
        let testPropertyId;
        (0, globals_1.beforeAll)(async () => {
            const { data } = await serviceClient
                .from('property')
                .insert({
                name: 'Test Property',
                propertyType: 'SINGLE_FAMILY',
                ownerId: ownerA.userId,
                address: '123 Test St',
                city: 'Test City',
                state: 'CA',
                zipCode: '12345'
            })
                .select()
                .single();
            if (data) {
                testPropertyId = data.id;
                testData.properties.push(data.id);
            }
        });
        (0, globals_1.it)('owner A can mark their property as sold', async () => {
            if (!testPropertyId) {
                console.warn('Test property not created - skipping test');
                return;
            }
            const { data, error } = await ownerA.client
                .from('property')
                .update({
                status: 'SOLD',
                date_sold: new Date().toISOString(),
                sale_price: 500000
            })
                .eq('id', testPropertyId)
                .select()
                .single();
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data?.status).toBe('SOLD');
        });
        (0, globals_1.it)('owner B cannot mark owner A property as sold', async () => {
            if (!testPropertyId) {
                console.warn('Test property not created - skipping test');
                return;
            }
            const { data, error } = await ownerB.client
                .from('property')
                .update({ status: 'SOLD' })
                .eq('id', testPropertyId)
                .select();
            if (error) {
                (0, setup_1.expectPermissionError)(error, 'owner B updating owner A property status');
            }
            else {
                (0, setup_1.expectEmptyResult)(data, 'owner B updating owner A property status');
            }
        });
    });
    (0, globals_1.describe)('Property Metadata Access', () => {
        (0, globals_1.it)('owner A can read property metadata (address, features)', async () => {
            const { data, error } = await ownerA.client
                .from('property')
                .select('id, name, address, city, state, zipCode, propertyType, description')
                .eq('ownerId', ownerA.userId)
                .limit(1);
            (0, globals_1.expect)(error).toBeNull();
            (0, globals_1.expect)(data).toBeDefined();
        });
        (0, globals_1.it)('tenant cannot access property owner information', async () => {
            const { data, error } = await tenantA.client
                .from('property')
                .select('ownerId, createdAt, updatedAt');
            (0, globals_1.expect)(error).toBeNull();
            (0, setup_1.expectEmptyResult)(data, 'tenant accessing property ownership data');
        });
    });
});
//# sourceMappingURL=property-isolation.integration.spec.js.map