/**
 * ESLint Rule: no-barrel-exports (Production-Ready)
 * 
 * Prevents unnecessary barrel files while allowing legitimate UI component libraries.
 * 
 * ALLOWED BARRELS:
 * - packages/shared/src/index.ts (centralized types export)
 * - apps/frontend/src/components/ui/index.ts (UI component library)
 * - apps/frontend/src/hooks/api/index.ts (API hooks convenience)
 * 
 * DISALLOWED:
 * - Random index.ts files that just re-export
 * - Wildcard exports (export *)
 * - Deep barrel nesting
 */

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Discourage barrel exports except for UI libraries and shared packages',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      unnecessaryBarrel: 'Unnecessary barrel file. Consider importing directly from source files.',
      wildcardExport: 'Avoid wildcard exports (export *). Use explicit named exports for better tree-shaking.',
      deepBarrel: 'Re-exporting from "{{source}}" creates unnecessary indirection.'
    },
    schema: [{
      type: 'object',
      properties: {
        allowedBarrels: {
          type: 'array',
          items: { type: 'string' },
          default: []
        }
      },
      additionalProperties: false
    }]
  },

  create(context) {
    const filename = context.getFilename()
    const options = context.options[0] || {}
    const allowedBarrels = options.allowedBarrels || []
    
    // Skip if not an index file
    if (!filename.endsWith('/index.ts') && 
        !filename.endsWith('/index.tsx') &&
        !filename.endsWith('/index.js')) {
      return {}
    }
    
    // Check if this is an allowed barrel
    const isAllowedBarrel = allowedBarrels.some(allowed => 
      filename.endsWith(allowed) || 
      filename.includes(allowed.replace(/\/index\.(ts|tsx|js)$/, ''))
    )
    
    if (isAllowedBarrel) {
      return {}
    }

    // Skip packages directory (they can have barrels)
    if (filename.includes('packages/')) {
      return {}
    }

    let hasReexports = false
    let hasOwnExports = false

    return {
      // Track if file has its own exports
      ExportNamedDeclaration(node) {
        if (node.source) {
          hasReexports = true
          
          // Warn about deep re-exports
          if (node.source.value.includes('/')) {
            context.report({
              node,
              messageId: 'deepBarrel',
              data: { source: node.source.value }
            })
          }
        } else if (node.declaration) {
          hasOwnExports = true
        }
      },

      // Warn about wildcard exports
      ExportAllDeclaration(node) {
        hasReexports = true
        context.report({
          node,
          messageId: 'wildcardExport'
        })
      },

      // Check at end of file
      'Program:exit'() {
        // If file ONLY has re-exports and no own content, it's unnecessary
        if (hasReexports && !hasOwnExports) {
          context.report({
            node: context.getSourceCode().ast,
            messageId: 'unnecessaryBarrel'
          })
        }
      }
    }
  }
}