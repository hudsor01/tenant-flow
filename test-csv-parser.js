#!/usr/bin/env node

/**
 * Standalone CSV Parser Test
 * Tests the parseCSVLine algorithm used in PropertiesService
 */

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Push last field
  result.push(current.trim())

  return result
}

// Test Cases
const tests = [
  {
    name: 'Simple fields',
    input: 'name,address,city,state,zipCode',
    expected: ['name', 'address', 'city', 'state', 'zipCode']
  },
  {
    name: 'Comma inside quotes',
    input: '"Property with, comma","123 Main St, Apt 5",San Francisco,CA,94105',
    expected: ['Property with, comma', '123 Main St, Apt 5', 'San Francisco', 'CA', '94105']
  },
  {
    name: 'Escaped quotes',
    input: '"Property ""The Oaks""","456 Oak Ave",Los Angeles,CA,90001',
    expected: ['Property "The Oaks"', '456 Oak Ave', 'Los Angeles', 'CA', '90001']
  },
  {
    name: 'Empty fields',
    input: 'Empty Optional Fields,789 Plain Street,San Diego,CA,92101,,',
    expected: ['Empty Optional Fields', '789 Plain Street', 'San Diego', 'CA', '92101', '', '']
  },
  {
    name: 'Mixed complex case',
    input: '"Complex, ""Property""","999 ""Test"" St","City, State",NY,10001',
    expected: ['Complex, "Property"', '999 "Test" St', 'City, State', 'NY', '10001']
  },
  {
    name: 'Whitespace trimming',
    input: '  Sunset Apartments  , 123 Main Street ,San Francisco,CA,94105',
    expected: ['Sunset Apartments', '123 Main Street', 'San Francisco', 'CA', '94105']
  }
]

console.log('CSV Parser Test Suite\n')
console.log('='.repeat(80))

let passed = 0
let failed = 0

tests.forEach((test, index) => {
  const result = parseCSVLine(test.input)
  const success = JSON.stringify(result) === JSON.stringify(test.expected)

  if (success) {
    console.log(`✅ Test ${index + 1}: ${test.name}`)
    passed++
  } else {
    console.log(`❌ Test ${index + 1}: ${test.name}`)
    console.log(`   Input:    ${test.input}`)
    console.log(`   Expected: ${JSON.stringify(test.expected)}`)
    console.log(`   Got:      ${JSON.stringify(result)}`)
    failed++
  }
})

console.log('='.repeat(80))
console.log(`\nResults: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('\n🎉 All tests passed! CSV parser is working correctly.')
  process.exit(0)
} else {
  console.log('\n⚠️  Some tests failed. Please review the parser implementation.')
  process.exit(1)
}
