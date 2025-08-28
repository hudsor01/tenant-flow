/**
 * ESLint Rule: no-inline-types (Production-Ready)
 * 
 * Enforces type centralization for COMPLEX types only.
 * Simple prop interfaces and KISS principle types are ALLOWED.
 * 
 * ALLOWED (following KISS principle):
 * - Simple prop interfaces (< 5 properties) 
 * - Types with "KISS principle" or "local type" comments
 * - React Hook Form register type (any)
 * - Simple function parameter types (< 3 properties)
 * 
 * DISALLOWED:
 * - Large interfaces (5+ properties)
 * - Complex type aliases with intersections/conditionals
 * - All enum declarations (should be centralized)
 * - Large inline object types (6+ properties)
 * - Enum-like unions (5+ literals)
 */

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce type centralization for complex types in packages/shared/src/types/',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      largeInterface: 'Large interface "{{name}}" ({{count}} properties) should be in packages/shared/src/types/',
      complexType: 'Complex type alias "{{name}}" should be in packages/shared/src/types/',
      enumDefinition: 'Enum "{{name}}" should be in packages/shared/src/types/ for consistency.',
      largeObjectType: 'Large inline object type ({{count}} properties) should be extracted to packages/shared/src/types/',
      enumLikeUnion: 'Enum-like union type ({{count}} literals) should be in packages/shared/src/types/'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename()
    const sourceCode = context.getSourceCode()
    
    // Skip packages directory and test files
    if (filename.includes('packages/') || 
        filename.includes('.test.') || 
        filename.includes('.spec.') ||
        filename.endsWith('.d.ts')) {
      return {}
    }

    // Helper: Check if node has KISS principle comment
    function hasKissComment(node) {
      const comments = sourceCode.getCommentsBefore(node)
      return comments.some(comment => {
        const text = comment.value.toLowerCase()
        return text.includes('kiss') || 
               text.includes('local type') ||
               text.includes('simple') ||
               text.includes('following kiss')
      })
    }

    return {
      // Only flag LARGE interfaces
      TSInterfaceDeclaration(node) {
        // Allow if has KISS comment
        if (hasKissComment(node)) return
        
        // Allow small interfaces (< 5 properties is simple)
        const propertyCount = node.body.body.length
        if (propertyCount >= 5) {
          context.report({
            node,
            messageId: 'largeInterface',
            data: { 
              name: node.id.name,
              count: propertyCount
            }
          })
        }
      },

      // Only flag COMPLEX type aliases
      TSTypeAliasDeclaration(node) {
        // Allow if has KISS comment
        if (hasKissComment(node)) return
        
        const typeAnnotation = node.typeAnnotation
        
        // Flag complex object types (5+ properties)
        if (typeAnnotation.type === 'TSTypeLiteral' && 
            typeAnnotation.members.length >= 5) {
          context.report({
            node,
            messageId: 'complexType',
            data: { name: node.id.name }
          })
        }
        
        // Flag intersections and conditionals (always complex)
        if (typeAnnotation.type === 'TSIntersectionType' || 
            typeAnnotation.type === 'TSConditionalType') {
          context.report({
            node,
            messageId: 'complexType',
            data: { name: node.id.name }
          })
        }
      },

      // Enums should always be centralized
      TSEnumDeclaration(node) {
        context.report({
          node,
          messageId: 'enumDefinition',
          data: { name: node.id.name }
        })
      },

      // Only flag LARGE inline object types
      'FunctionDeclaration TSTypeAnnotation > TSTypeLiteral'(node) {
        // Allow small objects (< 6 properties)
        if (node.members && node.members.length >= 6) {
          context.report({
            node,
            messageId: 'largeObjectType',
            data: { count: node.members.length }
          })
        }
      },

      // Only flag enum-like unions (5+ literals)
      TSUnionType(node) {
        const literalCount = node.types.filter(
          t => t.type === 'TSLiteralType' && 
               t.literal?.type === 'Literal'
        ).length
        
        if (literalCount >= 5) {
          context.report({
            node,
            messageId: 'enumLikeUnion',
            data: { count: literalCount }
          })
        }
      }
    }
  }
}