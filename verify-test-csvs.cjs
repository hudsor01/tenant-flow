#!/usr/bin/env node

/**
 * Verify Test CSV Files
 * Reads and parses the actual test CSV files
 */

const fs = require('fs')
const path = require('path')

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function validateProperty(row, headers, rowNumber) {
  const property = {}
  headers.forEach((header, index) => {
    property[header] = row[index] || ''
  })

  const errors = []

  // Required field validation
  if (!property.name?.trim()) {
    errors.push('Property name is required')
  }
  if (!property.address?.trim()) {
    errors.push('Property address is required')
  }
  if (!property.city?.trim() || !property.state?.trim() || !property.zipCode?.trim()) {
    errors.push('City, state, and zip code are required')
  }

  // Optional field validation
  const validTypes = ['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL', 'CONDO', 'TOWNHOUSE', 'OTHER']
  if (property.propertyType && !validTypes.includes(property.propertyType)) {
    errors.push(`Invalid property type: ${property.propertyType}. Must be one of: ${validTypes.join(', ')}`)
  }

  return { valid: errors.length === 0, errors, property }
}

function parseCSVFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())

  if (lines.length === 0) {
    return { error: 'CSV file is empty' }
  }

  const headers = parseCSVLine(lines[0])
  const rows = []
  const validationResults = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const validation = validateProperty(values, headers, i + 1)
    validationResults.push({ row: i + 1, ...validation })
    rows.push(validation.property)
  }

  const failedRows = validationResults.filter(r => !r.valid)

  return {
    headers,
    rows,
    validationResults,
    summary: {
      total: rows.length,
      valid: validationResults.filter(r => r.valid).length,
      invalid: failedRows.length,
      errors: failedRows.map(r => ({
        row: r.row,
        errors: r.errors
      }))
    }
  }
}

console.log('CSV File Verification\n')
console.log('='.repeat(80))

// Test all CSV files
const files = [
  'test-properties-valid.csv',
  'test-properties-edge-cases.csv',
  'test-properties-invalid.csv'
]

files.forEach(filename => {
  const filePath = path.join(__dirname, filename)

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${filename}: File not found`)
    return
  }

  console.log(`\n📄 ${filename}`)
  console.log('-'.repeat(80))

  const result = parseCSVFile(filePath)

  if (result.error) {
    console.log(`❌ Error: ${result.error}`)
    return
  }

  console.log(`Headers: ${result.headers.join(', ')}`)
  console.log(`Total rows: ${result.summary.total}`)
  console.log(`Valid rows: ${result.summary.valid}`)
  console.log(`Invalid rows: ${result.summary.invalid}`)

  if (result.summary.invalid > 0) {
    console.log('\nValidation Errors:')
    result.summary.errors.forEach(({ row, errors }) => {
      console.log(`  Row ${row}:`)
      errors.forEach(error => console.log(`    - ${error}`))
    })
  }

  if (filename.includes('edge-cases')) {
    console.log('\nParsed Properties (Edge Cases):')
    result.rows.forEach((prop, index) => {
      console.log(`\n  Property ${index + 1}:`)
      console.log(`    Name: "${prop.name}"`)
      console.log(`    Address: "${prop.address}"`)
      console.log(`    City: "${prop.city}"`)
      console.log(`    State: "${prop.state}"`)
      console.log(`    Zip: "${prop.zipCode}"`)
      console.log(`    Type: "${prop.propertyType}"`)
      console.log(`    Description: "${prop.description}"`)
    })
  }
})

console.log('\n' + '='.repeat(80))
console.log('\n✅ Verification complete!')
