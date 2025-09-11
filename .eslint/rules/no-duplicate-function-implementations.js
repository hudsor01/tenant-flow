/**
 * ESLint Rule: no-duplicate-function-implementations
 * 
 * Prevents duplicate function implementations to enforce DRY principles.
 * Detects functions with similar logic, parameter patterns, or return structures
 * that should be consolidated into single reusable functions.
 * 
 * CLAUDE.md Compliance: DRY principle - eliminates function duplication
 * 
 * Examples of violations:
 * - Functions with identical or near-identical implementations
 * - Similar utility functions that could be generalized
 * - Repeated transformation logic across different functions
 */

const createRule = (config) => config

export default createRule({
  name: 'no-duplicate-function-implementations',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevents duplicate function implementations',
      recommended: 'warn'
    },
    messages: {
      duplicateFunction: 'Duplicate function implementation detected: "{{func1}}" and "{{func2}}" are {{similarity}}% similar (min: {{minLength}} lines). Consider consolidating.',
      nearDuplicate: 'Near-duplicate function detected: "{{func1}}" and "{{func2}}". Consider extracting common logic.'
    },
    schema: [{
      type: 'object',
      properties: {
        similarity: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          default: 0.85
        },
        minLength: {
          type: 'number',
          minimum: 1,
          default: 10
        }
      },
      additionalProperties: false
    }]
  },
  defaultOptions: [{
    similarity: 0.85,
    minLength: 10
  }],
  create(context) {
    const options = context.options[0] || {}
    const similarityThreshold = options.similarity || 0.85
    const minLength = options.minLength || 10
    const functions = []
    
    return {
      // Collect function declarations
      FunctionDeclaration(node) {
        if (node.id && node.body) {
          const body = context.getSourceCode().getText(node.body)
          const lineCount = body.split('\n').length
          
          if (lineCount >= minLength) {
            functions.push({
              node,
              name: node.id.name,
              body,
              lineCount
            })
          }
        }
      },

      // Collect function expressions and arrow functions
      VariableDeclarator(node) {
        if (node.id && node.id.type === 'Identifier' && node.init &&
            (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression')) {
          const body = context.getSourceCode().getText(node.init.body || node.init)
          const lineCount = body.split('\n').length
          
          if (lineCount >= minLength) {
            functions.push({
              node: node.init,
              name: node.id.name,
              body,
              lineCount
            })
          }
        }
      },

      // Collect method definitions in classes
      MethodDefinition(node) {
        if (node.key && node.value && node.value.body) {
          const body = context.getSourceCode().getText(node.value.body)
          const lineCount = body.split('\n').length
          
          if (lineCount >= minLength) {
            functions.push({
              node: node.value,
              name: node.key.name || 'method',
              body,
              lineCount
            })
          }
        }
      },

      'Program:exit'() {
        // Compare all collected functions for similarity
        for (let i = 0; i < functions.length; i++) {
          for (let j = i + 1; j < functions.length; j++) {
            const func1 = functions[i]
            const func2 = functions[j]
            
            // Skip if same function name (could be overloads)
            if (func1.name === func2.name) continue
            
            const similarity = calculateCodeSimilarity(func1.body, func2.body)
            
            if (similarity >= similarityThreshold) {
              context.report({
                node: func2.node,
                messageId: 'duplicateFunction',
                data: {
                  func1: func1.name,
                  func2: func2.name,
                  similarity: Math.round(similarity * 100),
                  minLength: minLength
                }
              })
            } else if (similarity >= 0.7) { // Near-duplicate threshold
              context.report({
                node: func2.node,
                messageId: 'nearDuplicate',
                data: {
                  func1: func1.name,
                  func2: func2.name
                }
              })
            }
          }
        }
      }
    }
  }
})

function calculateCodeSimilarity(code1, code2) {
  // Normalize code by removing whitespace and comments
  const normalize = (code) => {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[{}();,]/g, '') // Remove structural characters
      .toLowerCase()
      .trim()
  }
  
  const norm1 = normalize(code1)
  const norm2 = normalize(code2)
  
  // Use Levenshtein-based similarity for code comparison
  return 1 - (levenshteinDistance(norm1, norm2) / Math.max(norm1.length, norm2.length))
}

function levenshteinDistance(str1, str2) {
  const matrix = []
  
  if (str1.length === 0) return str2.length
  if (str2.length === 0) return str1.length
  
  // Create matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}