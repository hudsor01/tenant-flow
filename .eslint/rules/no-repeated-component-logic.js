/**
 * ESLint Rule: no-repeated-component-logic
 * 
 * Prevents repeated logic patterns in React components to enforce DRY principles.
 * Detects similar component logic, duplicate state management patterns,
 * or repeated effect logic that should be extracted to custom hooks.
 * 
 * CLAUDE.md Compliance: DRY principle - eliminates component logic duplication
 * 
 * Examples of violations:
 * - Similar useState patterns across components
 * - Duplicate useEffect logic
 * - Repeated event handlers with similar logic
 */

const createRule = (config) => config

export default createRule({
  name: 'no-repeated-component-logic',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevents repeated logic patterns in React components',
      recommended: 'warn'
    },
    messages: {
      repeatedLogic: 'Similar component logic detected. Consider extracting to a custom hook.',
      duplicateState: 'Duplicate state management pattern detected in components "{{comp1}}" and "{{comp2}}". Consider shared hook.',
      similarEffect: 'Similar useEffect logic detected. Consider extracting to a custom hook.',
      repeatedHandler: 'Similar event handler logic detected across components.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const components = []
    const statePatterns = []
    const effectPatterns = []
    
    return {
      // Collect React function components
      FunctionDeclaration(node) {
        if (node.id && /^[A-Z]/.test(node.id.name)) { // React component naming convention
          components.push({
            node,
            name: node.id.name,
            body: context.getSourceCode().getText(node.body)
          })
        }
      },

      // Collect arrow function components
      VariableDeclarator(node) {
        if (node.id && node.id.type === 'Identifier' && 
            /^[A-Z]/.test(node.id.name) && node.init &&
            (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')) {
          components.push({
            node: node.init,
            name: node.id.name,
            body: context.getSourceCode().getText(node.init.body || node.init)
          })
        }
      },

      // Track useState patterns
      CallExpression(node) {
        if (node.callee && node.callee.name === 'useState') {
          const parent = node.parent
          if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'ArrayPattern') {
            statePatterns.push({
              node,
              pattern: context.getSourceCode().getText(parent),
              component: findParentComponent(node)
            })
          }
        }
        
        // Track useEffect patterns
        if (node.callee && node.callee.name === 'useEffect') {
          const effectBody = node.arguments[0] ? context.getSourceCode().getText(node.arguments[0]) : ''
          effectPatterns.push({
            node,
            body: effectBody,
            component: findParentComponent(node)
          })
        }
      },

      'Program:exit'() {
        // Check for similar components
        for (let i = 0; i < components.length; i++) {
          for (let j = i + 1; j < components.length; j++) {
            const comp1 = components[i]
            const comp2 = components[j]
            
            const similarity = calculateSimilarity(comp1.body, comp2.body)
            if (similarity > 0.6) { // 60% similarity threshold
              context.report({
                node: comp2.node,
                messageId: 'repeatedLogic',
                data: {
                  comp1: comp1.name,
                  comp2: comp2.name
                }
              })
            }
          }
        }

        // Check for similar state patterns
        checkSimilarPatterns(statePatterns, 'duplicateState')
        
        // Check for similar effects
        checkSimilarPatterns(effectPatterns, 'similarEffect')
      }
    }

    function findParentComponent(node) {
      let parent = node.parent
      while (parent) {
        if (parent.type === 'FunctionDeclaration' && parent.id && /^[A-Z]/.test(parent.id.name)) {
          return parent.id.name
        }
        parent = parent.parent
      }
      return 'Unknown'
    }

    function checkSimilarPatterns(patterns, messageId) {
      for (let i = 0; i < patterns.length; i++) {
        for (let j = i + 1; j < patterns.length; j++) {
          const pattern1 = patterns[i]
          const pattern2 = patterns[j]
          
          const similarity = calculateSimilarity(
            pattern1.pattern || pattern1.body,
            pattern2.pattern || pattern2.body
          )
          
          if (similarity > 0.8) { // 80% similarity for patterns
            context.report({
              node: pattern2.node,
              messageId,
              data: {
                comp1: pattern1.component,
                comp2: pattern2.component
              }
            })
          }
        }
      }
    }
  }
})

function calculateSimilarity(str1, str2) {
  // Simple Jaccard similarity
  const tokens1 = new Set(str1.split(/\W+/).filter(t => t.length > 2))
  const tokens2 = new Set(str2.split(/\W+/).filter(t => t.length > 2))
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)))
  const union = new Set([...tokens1, ...tokens2])
  
  return intersection.size / union.size
}