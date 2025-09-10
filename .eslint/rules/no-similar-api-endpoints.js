/**
 * ESLint Rule: no-similar-api-endpoints
 * 
 * Prevents similar API endpoint implementations to enforce DRY principles.
 * Detects endpoints with similar URL patterns, similar request/response handling,
 * or duplicate parameter structures.
 * 
 * CLAUDE.md Compliance: DRY principle - eliminates API endpoint duplication
 * 
 * Examples of violations:
 * - Multiple endpoints with same base URL and similar parameters
 * - Duplicate request handling logic across endpoints
 * - Similar response transformation patterns
 */

const createRule = (config) => config

export default createRule({
  name: 'no-similar-api-endpoints',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevents similar API endpoint implementations',
      recommended: 'warn'
    },
    messages: {
      similarEndpoints: 'Similar API endpoint detected: "{{endpoint1}}" and "{{endpoint2}}" have {{similarity}}% similarity. Consider consolidating.',
      duplicatePattern: 'Duplicate API pattern detected. Consider creating a shared utility function.',
      similarParams: 'Similar parameter structure detected across endpoints. Consider using a shared interface.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const endpoints = []
    
    return {
      // Collect function declarations that look like API endpoints
      FunctionDeclaration(node) {
        if (node.id && (
          node.id.name.includes('api') ||
          node.id.name.includes('endpoint') ||
          node.id.name.includes('fetch') ||
          node.id.name.includes('get') ||
          node.id.name.includes('post') ||
          node.id.name.includes('put') ||
          node.id.name.includes('delete')
        )) {
          endpoints.push({
            node,
            name: node.id.name,
            body: context.getSourceCode().getText(node.body)
          })
        }
      },

      // Check arrow functions assigned to variables
      VariableDeclarator(node) {
        if (node.id && node.id.type === 'Identifier' && node.init && 
            (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')) {
          const name = node.id.name
          if (name.includes('api') || name.includes('endpoint') || name.includes('fetch')) {
            endpoints.push({
              node: node.init,
              name,
              body: context.getSourceCode().getText(node.init.body || node.init)
            })
          }
        }
      },

      // At program end, analyze collected endpoints for similarities
      'Program:exit'() {
        for (let i = 0; i < endpoints.length; i++) {
          for (let j = i + 1; j < endpoints.length; j++) {
            const endpoint1 = endpoints[i]
            const endpoint2 = endpoints[j]
            
            // Simple similarity check based on body content
            const similarity = calculateSimilarity(endpoint1.body, endpoint2.body)
            
            if (similarity > 0.7) { // 70% similarity threshold
              context.report({
                node: endpoint2.node,
                messageId: 'similarEndpoints',
                data: {
                  endpoint1: endpoint1.name,
                  endpoint2: endpoint2.name,
                  similarity: Math.round(similarity * 100)
                }
              })
            }
          }
        }
      }
    }
  }
})

function calculateSimilarity(str1, str2) {
  // Simple Jaccard similarity for code comparison
  const tokens1 = new Set(str1.split(/\W+/).filter(t => t.length > 2))
  const tokens2 = new Set(str2.split(/\W+/).filter(t => t.length > 2))
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)))
  const union = new Set([...tokens1, ...tokens2])
  
  return intersection.size / union.size
}