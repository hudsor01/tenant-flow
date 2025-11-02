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
	/**
	 * Validates if a string is a valid UUID (any version)
	 * Matches standard UUID format: 8-4-4-4-12 hexadecimal digits
	 * @param {string} uuid - The UUID string to validate
	 * @returns {boolean} True if valid UUID format, false otherwise
	 */
	validate: (uuid) => {
		if (typeof uuid !== 'string') return false
		// UUID regex pattern: xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
		// M = version (1-5), N = variant (8, 9, a, b)
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		return uuidRegex.test(uuid)
	},

	/**
	 * Extracts the version number from a UUID string
	 * The version is encoded in the 15th character (M in format: xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx)
	 * @param {string} uuid - The UUID string to parse
	 * @returns {number} The version number (1-5), or 0 if invalid UUID
	 */
	version: (uuid) => {
		if (typeof uuid !== 'string') return 0
		// Version is at position 14 (0-indexed): xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
		//                                         0       9    14
		const versionChar = uuid.charAt(14)
		const version = parseInt(versionChar, 10)
		return (version >= 1 && version <= 5) ? version : 0
	}
}
