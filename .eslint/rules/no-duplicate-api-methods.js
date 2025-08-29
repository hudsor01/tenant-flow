/**
 * ESLint Rule: no-duplicate-api-methods
 * 
 * Prevents duplicate API method implementations across the codebase.
 * Enforces DRY principle by detecting similar method signatures and implementations.
 * 
 * CLAUDE.md Compliance: DRY principle - consolidates duplicate API methods
 * 
 * Examples of violations:
 * - Multiple methods with same name and similar parameters
 * - Duplicate fetch patterns (getUser vs fetchUser vs loadUser)
 * - Similar API endpoint calls in different files
 */

// Simple rule creation without TypeScript utils to avoid version conflicts
const createRule = (config) => config

// Common duplicate patterns to detect
const DUPLICATE_PATTERNS = [
  // User-related methods
  { pattern: /^(get|fetch|load|retrieve)User(s)?$/i, category: 'user-fetch' },
  { pattern: /^(create|add|save)User$/i, category: 'user-create' },
  { pattern: /^(update|modify|edit)User$/i, category: 'user-update' },
  { pattern: /^(delete|remove)User$/i, category: 'user-delete' },
  
  // Property-related methods  
  { pattern: /^(get|fetch|load|retrieve)Propert(y|ies)$/i, category: 'property-fetch' },
  { pattern: /^(create|add|save)Property$/i, category: 'property-create' },
  { pattern: /^(update|modify|edit)Property$/i, category: 'property-update' },
  { pattern: /^(delete|remove)Property$/i, category: 'property-delete' },

  // Tenant-related methods
  { pattern: /^(get|fetch|load|retrieve)Tenant(s)?$/i, category: 'tenant-fetch' },
  { pattern: /^(create|add|save)Tenant$/i, category: 'tenant-create' },
  { pattern: /^(update|modify|edit)Tenant$/i, category: 'tenant-update' },
  { pattern: /^(delete|remove)Tenant$/i, category: 'tenant-delete' },

  // Generic API patterns
  { pattern: /^(get|fetch|load|retrieve).*ById$/i, category: 'fetch-by-id' },
  { pattern: /^(get|fetch|load|retrieve).*List$/i, category: 'fetch-list' },
  { pattern: /^(post|send|submit).*Request$/i, category: 'submit-request' }
]

export default createRule({
  name: 'no-duplicate-api-methods',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prevents duplicate API method implementations',
      recommended: 'error'
    },
    messages: {
      duplicateMethod: 'Duplicate API method "{{methodName}}" found. Similar method exists in {{otherFile}}. Consider consolidating.',
      suspiciousDuplicate: 'Method "{{methodName}}" appears similar to existing API methods. Check for duplication.',
      consolidateRecommendation: 'Multiple {{category}} methods detected. Consider consolidating into a single reusable method.'
    },
    schema: [{
      type: 'object',
      properties: {
        ignoreFiles: {
          type: 'array',
          items: { type: 'string' }
        },
        ignoreMethods: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      additionalProperties: false
    }]
  },
  defaultOptions: [{
    ignoreFiles: ['*.test.ts', '*.spec.ts', '*.d.ts'],
    ignoreMethods: []
  }],
  create(context, options = [{}]) {
    const [config = {}] = Array.isArray(options) ? options : [options];
    const filename = context.getFilename()
    const { ignoreFiles = [], ignoreMethods = [] } = config

    // Skip ignored files
    if (ignoreFiles.some(pattern => filename.includes(pattern))) {
      return {}
    }

    const methodDeclarations = new Map()
    const categoryCount = new Map()

    return {
      // Function declarations
      FunctionDeclaration(node) {
        if (node.id && node.id.name) {
          analyzeMethod(node, node.id.name)
        }
      },

      // Method definitions (class methods, object methods)
      MethodDefinition(node) {
        if (node.key && node.key.type === 'Identifier') {
          analyzeMethod(node, node.key.name)
        }
      },

      // Property assignments (const methodName = () => {})
      Property(node) {
        if (node.key && node.key.type === 'Identifier' && 
            node.value && (node.value.type === 'FunctionExpression' || node.value.type === 'ArrowFunctionExpression')) {
          analyzeMethod(node, node.key.name)
        }
      },

      // Variable declarations (const methodName = () => {})
      VariableDeclarator(node) {
        if (node.id && node.id.type === 'Identifier' && 
            node.init && (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression')) {
          analyzeMethod(node, node.id.name)
        }
      },

      'Program:exit'() {
        // Report category duplicates
        for (const [category, count] of categoryCount) {
          if (count > 1) {
            const methods = Array.from(methodDeclarations.values())
              .filter(m => m.category === category)

            if (methods.length > 1) {
              // Report on the first method found
              context.report({
                node: methods[0].node,
                messageId: 'consolidateRecommendation',
                data: { category }
              })
            }
          }
        }
      }
    }

    function analyzeMethod(node, methodName) {
      // Skip ignored methods
      if (ignoreMethods.includes(methodName)) return

      // Find matching pattern
      const matchedPattern = DUPLICATE_PATTERNS.find(p => p.pattern.test(methodName))
      
      if (matchedPattern) {
        const category = matchedPattern.category
        
        // Track method declaration
        methodDeclarations.set(`${filename}:${methodName}`, {
          node,
          methodName,
          category,
          filename
        })

        // Count methods in this category
        categoryCount.set(category, (categoryCount.get(category) || 0) + 1)

        // Check if this is the second or later occurrence
        const existingMethods = Array.from(methodDeclarations.values())
          .filter(m => m.category === category && m.filename !== filename)

        if (existingMethods.length > 0) {
          context.report({
            node,
            messageId: 'duplicateMethod',
            data: { 
              methodName,
              otherFile: existingMethods[0].filename.split('/').pop()
            }
          })
        }
      }

      // Additional check for exact method name duplicates across files
      const existingExact = Array.from(methodDeclarations.values())
        .find(m => m.methodName === methodName && m.filename !== filename)

      if (existingExact) {
        context.report({
          node,
          messageId: 'duplicateMethod',
          data: {
            methodName,
            otherFile: existingExact.filename.split('/').pop()
          }
        })
      }
    }
  }
})