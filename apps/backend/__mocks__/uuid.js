// Mock for uuid package - Jest ESM compatibility
// uuid v13+ is ESM-only, this provides a CommonJS mock for Jest tests
module.exports = {
	v4: () => '00000000-0000-4000-8000-000000000000',
	v1: () => '00000000-0000-1000-8000-000000000000',
	v3: () => '00000000-0000-3000-8000-000000000000',
	v5: () => '00000000-0000-5000-8000-000000000000',
	validate: () => true,
	version: () => 4
}
