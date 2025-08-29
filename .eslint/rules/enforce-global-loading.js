/**
 * ESLint Rule: enforce-global-loading
 * 
 * Prevents creation of individual loading components and enforces use of global loading.
 * Maintains DRY principle by ensuring single loading implementation.
 * 
 * CLAUDE.md Compliance: DRY principle - single global loading component
 * 
 * Examples of violations:
 * - Creating <LoadingSpinner> components
 * - Individual loading state components
 * - Custom loading JSX in components
 * 
 * Correct usage:
 * - Use global loading.tsx in app directory
 * - Use loading states from TanStack Query
 */

// Simple rule creation without TypeScript utils to avoid version conflicts
const createRule = (config) => config

const LOADING_PATTERNS = [
  // Component names
  /Loading/i,
  /Spinner/i,
  /Skeleton/i,
  /Loader/i,
  /Progress/i,
  
  // JSX content patterns
  /loading\.{3}/i,
  /please wait/i,
  /fetching/i,
  /^loading$/i
]

const LOADING_ELEMENT_PATTERNS = [
  /div.*loading/i,
  /span.*loading/i,
  /loading.*spinner/i,
  /loading.*indicator/i
]

const ACCEPTABLE_LOADING_FILES = [
  'app/loading.tsx',
  'loading.tsx',
  'global-loading',
  'app-loading'
]

export default createRule({
  name: 'enforce-global-loading',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforces use of global loading component instead of individual loading components',
      recommended: 'warn'
    },
    messages: {
      customLoadingComponent: 'Custom loading component "{{componentName}}" detected. Use global loading.tsx instead.',
      loadingJSX: 'Inline loading JSX detected. Use global loading.tsx or TanStack Query loading states instead.',
      loadingVariable: 'Custom loading variable "{{variableName}}" detected. Use TanStack Query isLoading state instead.',
      recommendGlobal: 'Use the global loading.tsx component or TanStack Query loading states for consistent UX.'
    },
    schema: [{
      type: 'object',
      properties: {
        allowFiles: {
          type: 'array',
          items: { type: 'string' }
        },
        allowComponents: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      additionalProperties: false
    }]
  },
  defaultOptions: [{
    allowFiles: ACCEPTABLE_LOADING_FILES,
    allowComponents: ['Button'] // Allow loading states on buttons
  }],
  create(context, options = [{}]) {
    const [config = {}] = Array.isArray(options) ? options : [options];
    const filename = context.getFilename()
    const sourceCode = context.getSourceCode()
    const { allowFiles = [], allowComponents = [] } = config

    // Skip allowed files
    if (allowFiles.some(allowed => filename.includes(allowed))) {
      return {}
    }

    return {
      // Function declarations and components
      FunctionDeclaration(node) {
        if (node.id && node.id.name) {
          checkComponentName(node, node.id.name)
        }
      },

      // Variable declarations (const LoadingComponent = ...)
      VariableDeclarator(node) {
        if (node.id && node.id.type === 'Identifier') {
          // Check for component declarations
          if (node.init && (
            node.init.type === 'ArrowFunctionExpression' ||
            node.init.type === 'FunctionExpression'
          )) {
            checkComponentName(node, node.id.name)
          }
          
          // Check for loading-related variables
          if (LOADING_PATTERNS.some(pattern => pattern.test(node.id.name)) &&
              !allowComponents.includes(node.id.name)) {
            context.report({
              node,
              messageId: 'loadingVariable',
              data: { variableName: node.id.name }
            })
          }
        }
      },

      // JSX Elements
      JSXElement(node) {
        const elementName = getJSXElementName(node)
        
        if (elementName && LOADING_PATTERNS.some(pattern => pattern.test(elementName))) {
          // Skip allowed components
          if (!allowComponents.includes(elementName)) {
            context.report({
              node,
              messageId: 'customLoadingComponent',
              data: { componentName: elementName }
            })
          }
        }

        // Check JSX content for loading text
        const hasLoadingText = hasLoadingContent(node)
        if (hasLoadingText) {
          context.report({
            node,
            messageId: 'loadingJSX'
          })
        }
      },

      // JSX Self-closing elements
      JSXFragment(node) {
        const hasLoadingText = hasLoadingContent(node)
        if (hasLoadingText) {
          context.report({
            node,
            messageId: 'loadingJSX'
          })
        }
      }
    }

    function checkComponentName(node, name) {
      if (LOADING_PATTERNS.some(pattern => pattern.test(name)) &&
          !allowComponents.includes(name)) {
        context.report({
          node,
          messageId: 'customLoadingComponent',
          data: { componentName: name }
        })
      }
    }

    function getJSXElementName(node) {
      if (node.openingElement && node.openingElement.name) {
        if (node.openingElement.name.type === 'JSXIdentifier') {
          return node.openingElement.name.name
        }
      }
      return null
    }

    function hasLoadingContent(node) {
      const text = sourceCode.getText(node)
      
      // Check for loading-related text content
      const hasLoadingText = LOADING_PATTERNS.some(pattern => pattern.test(text))
      
      // Check for loading-related className or attributes
      const hasLoadingAttributes = LOADING_ELEMENT_PATTERNS.some(pattern => pattern.test(text))
      
      // Look for spinner/loading icons (like lucide icons)
      const hasLoadingIcons = /Loader2|Spinner|LoaderIcon|SpinnerIcon/i.test(text)
      
      return hasLoadingText || hasLoadingAttributes || hasLoadingIcons
    }
  }
})