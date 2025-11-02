// Mock for uuid package - Jest ESM compatibility
// uuid v13+ is ESM-only, this provides a CommonJS mock for Jest tests
// Generates unique UUIDs per call to prevent test collisions

let v4Counter = 0
let v1Counter = 0
let v3Counter = 0
let v5Counter = 0

module.exports = {
	v4: () => {
		const counter = String(v4Counter++).padStart(12, '0')
		return `${counter.slice(0, 8)}-${counter.slice(8, 12)}-4000-8000-000000000000`
	},
	v1: () => {
		const counter = String(v1Counter++).padStart(12, '0')
		return `${counter.slice(0, 8)}-${counter.slice(8, 12)}-1000-8000-000000000000`
	},
	v3: () => {
		const counter = String(v3Counter++).padStart(12, '0')
		return `${counter.slice(0, 8)}-${counter.slice(8, 12)}-3000-8000-000000000000`
	},
	v5: () => {
		const counter = String(v5Counter++).padStart(12, '0')
		return `${counter.slice(0, 8)}-${counter.slice(8, 12)}-5000-8000-000000000000`
	},
	validate: () => true,
	version: () => 4
}
