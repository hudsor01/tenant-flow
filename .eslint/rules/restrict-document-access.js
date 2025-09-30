/**
 * ESLint Rule: restrict-document-access
 *
 * Enforces the use of DOM sanitization utilities instead of direct document access.
 * Prevents security vulnerabilities from unsafe DOM manipulation.
 *
 * @fileoverview Restrict direct document access to prevent XSS and injection attacks
 */

const UNSAFE_DOCUMENT_PROPERTIES = [
  'cookie',
  'createElement',
  'querySelector',
  'querySelectorAll',
  'getElementById',
  'getElementsByClassName',
  'getElementsByTagName',
  'head',
  'body',
  'documentElement'
]

const UNSAFE_DOCUMENT_METHODS = [
  'write',
  'writeln',
  'open',
  'close',
  'appendChild',
  'removeChild',
  'insertBefore',
  'replaceChild'
]

const ALLOWED_ALTERNATIVES = {
  'document.cookie': 'Use secureCookie.get() and secureCookie.set() from @/lib/dom-utils',
  'document.createElement': 'Use safeDom.createElement() from @/lib/dom-utils',
  'document.querySelector': 'Use safeDom.querySelector() from @/lib/dom-utils',
  'document.querySelectorAll': 'Use safeDom.querySelectorAll() from @/lib/dom-utils',
  'document.documentElement': 'Use safeDocumentElement methods from @/lib/dom-utils',
  'document.addEventListener': 'Use safeDocumentEvents.addEventListener() from @/lib/dom-utils',
  'document.head.appendChild': 'Use safeScript.load() from @/lib/dom-utils',
  'document.getElementById': 'Use safeDom.querySelector() with ID selector from @/lib/dom-utils'
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Restrict direct document access to enforce DOM sanitization',
      category: 'Security',
      recommended: true
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowedFiles: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          allowedMethods: {
            type: 'array',
            items: {
              type: 'string'
            }
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      restrictedDocumentAccess: 'Direct access to {{ property }} is restricted. {{ suggestion }}',
      restrictedDocumentMethod: 'Direct use of {{ method }} is restricted. {{ suggestion }}',
      unsafeInnerHTML: 'Setting innerHTML directly is unsafe. Use textContent or safe DOM methods.',
      unsafeEventHandler: 'Direct event handler assignment is restricted. Use safeDocumentEvents from @/lib/dom-utils.'
    }
  },

  create(context) {
    const options = context.options[0] || {}
    const allowedFiles = options.allowedFiles || []

    // Check if current file is in allowed files list
    const filename = context.getFilename()
    const isAllowedFile = allowedFiles.some(pattern =>
      filename.includes(pattern) || new RegExp(pattern).test(filename)
    )

    // Skip test files and specific allowed files
    if (isAllowedFile ||
        filename.includes('.spec.ts') ||
        filename.includes('.test.ts') ||
        filename.includes('.spec.tsx') ||
        filename.includes('.test.tsx') ||
        filename.includes('test-utils') ||
        filename.includes('tests/') ||
        filename.includes('__tests__/')) {
      return {}
    }

    function checkMemberExpression(node) {
      if (node.object && node.object.name === 'document') {
        const property = node.property.name

        // Check for restricted properties
        if (UNSAFE_DOCUMENT_PROPERTIES.includes(property)) {
          const fullExpression = `document.${property}`
          const suggestion = ALLOWED_ALTERNATIVES[fullExpression] ||
            'Use appropriate sanitization utility from @/lib/dom-utils'

          context.report({
            node,
            messageId: 'restrictedDocumentAccess',
            data: {
              property: fullExpression,
              suggestion
            }
          })
        }

        // Check for restricted methods
        if (UNSAFE_DOCUMENT_METHODS.includes(property)) {
          const suggestion = ALLOWED_ALTERNATIVES[`document.${property}`] ||
            'Use safe DOM manipulation methods from @/lib/dom-utils'

          context.report({
            node,
            messageId: 'restrictedDocumentMethod',
            data: {
              method: `document.${property}()`,
              suggestion
            }
          })
        }
      }

      // Check for chained document access (e.g., document.head.appendChild)
      if (node.object &&
          node.object.type === 'MemberExpression' &&
          node.object.object &&
          node.object.object.name === 'document') {

        const chainedAccess = `document.${node.object.property.name}.${node.property.name}`
        const suggestion = ALLOWED_ALTERNATIVES[chainedAccess] ||
          'Use safe DOM manipulation methods from @/lib/dom-utils'

        context.report({
          node,
          messageId: 'restrictedDocumentAccess',
          data: {
            property: chainedAccess,
            suggestion
          }
        })
      }
    }

    function checkAssignmentExpression(node) {
      // Check for innerHTML assignments
      if (node.left &&
          node.left.type === 'MemberExpression' &&
          node.left.property &&
          node.left.property.name === 'innerHTML') {
        context.report({
          node,
          messageId: 'unsafeInnerHTML'
        })
      }

      // Check for direct event handler assignments (element.onclick = ...)
      if (node.left &&
          node.left.type === 'MemberExpression' &&
          node.left.property &&
          node.left.property.name &&
          node.left.property.name.startsWith('on')) {
        context.report({
          node,
          messageId: 'unsafeEventHandler'
        })
      }
    }

    return {
      MemberExpression: checkMemberExpression,
      AssignmentExpression: checkAssignmentExpression,

      // Check for typeof document checks (these are usually safe)
      BinaryExpression(node) {
        if (node.operator === '===' || node.operator === '!==') {
          // Allow typeof document checks
          if ((node.left.type === 'UnaryExpression' &&
               node.left.operator === 'typeof' &&
               node.left.argument.name === 'document') ||
              (node.right.type === 'UnaryExpression' &&
               node.right.operator === 'typeof' &&
               node.right.argument.name === 'document')) {
            return // Allow typeof document checks
          }
        }
      }
    }
  }
}
