/**
 * Test Data Fixtures and Factories
 * Official Playwright pattern for reusable test data
 * Based on: https://playwright.dev/docs/test-fixtures
 *
 * Factories create realistic test data with sensible defaults
 * while allowing per-test customization.
 */

import { faker } from "@faker-js/faker";

// Local test data contracts (kept narrow to the fields used in E2E flows)
interface TenantInput {
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
	emergency_contact: string;
	avatarUrl: string | null;
}

interface PropertyInput {
	name: string;
	address: string;
	city: string;
	state: string;
	postal_code: string;
	property_type: string;
	units: number;
	description?: string;
	yearBuilt?: number;
}

/**
 * Tenant Factory
 * Creates realistic tenant data with unique identifiers
 */
export const createTenant = (overrides?: Partial<TenantInput>): TenantInput => {
	const first_name = faker.person.firstName();
	const last_name = faker.person.lastName();

	return {
		first_name,
		last_name,
		email: faker.internet
			.email({
				firstName: first_name.toLowerCase(),
				lastName: last_name.toLowerCase(),
			})
			.toLowerCase(),
		phone: faker.phone.number(),
		emergency_contact: `${faker.person.fullName()} - ${faker.phone.number()}`,
		avatarUrl: null,
		...overrides,
	};
};

/**
 * Property Factory
 * Creates realistic property data
 */
export const createProperty = (
	overrides?: Partial<PropertyInput>,
): PropertyInput => {
	return {
		name: `${faker.location.streetAddress()} Apartments`,
		address: faker.location.streetAddress(),
		city: faker.location.city(),
		state: faker.location.state({ abbreviated: true }),
		postal_code: faker.location.zipCode("#####"),
		property_type: faker.helpers.arrayElement([
			"apartment",
			"house",
			"condo",
			"townhouse",
		]),
		units: faker.number.int({ min: 4, max: 24 }),
		description: faker.lorem.paragraph(),
		yearBuilt: faker.number.int({ min: 1950, max: 2024 }),
		...overrides,
	};
};
