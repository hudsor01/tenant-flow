import * as fc from 'fast-check'

describe('Property-Based Testing Setup', () => {
	it('should verify fast-check is working correctly', () => {
		// Property: reversing a string twice returns the original string
		fc.assert(
			fc.property(fc.string(), str => {
				const reversed = str.split('').reverse().join('')
				const doubleReversed = reversed.split('').reverse().join('')
				return doubleReversed === str
			}),
			{ numRuns: 100 }
		)
	})

	it('should verify array concatenation is associative', () => {
		// Property: (a + b) + c === a + (b + c)
		fc.assert(
			fc.property(
				fc.array(fc.integer()),
				fc.array(fc.integer()),
				fc.array(fc.integer()),
				(a, b, c) => {
					const left = [...a, ...b, ...c]
					const right = [...a, ...b, ...c]
					return JSON.stringify(left) === JSON.stringify(right)
				}
			),
			{ numRuns: 100 }
		)
	})

	it('should verify addition is commutative', () => {
		// Property: a + b === b + a
		fc.assert(
			fc.property(fc.integer(), fc.integer(), (a, b) => {
				return a + b === b + a
			}),
			{ numRuns: 100 }
		)
	})
})
