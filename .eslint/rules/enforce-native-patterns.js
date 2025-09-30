/**
 * ESLint rule to enforce native platform patterns over custom abstractions
 * Aligns with CLAUDE.md principles: NO ABSTRACTIONS - USE NATIVE FEATURES ONLY
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce native platform patterns over custom abstractions',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          allowedWrappers: {
            type: 'array',
            items: { type: 'string' },
            default: ['toast', 'createClient'],
            description: 'Wrapper functions that are allowed'
          },
          nativePatterns: {
            type: 'object',
            description: 'Map of patterns to native alternatives'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      useNativeSupabase: 'Use native Supabase client methods instead of custom wrappers',
      useNativeRadix: 'Use Radix primitives directly with asChild pattern instead of custom components',
      useNativeTailwind: 'Use Tailwind utilities directly instead of custom CSS abstractions',
      useNativeFetch: 'Use native fetch API instead of custom HTTP clients (except api-client.ts)',
      useNativeReactQuery: 'Use TanStack Query hooks directly instead of custom data fetching wrappers',
      useNativeZustand: 'Use Zustand store directly instead of custom state abstractions',
      avoidCustomMiddleware: 'Use platform middleware (NestJS, Fastify, Next.js) instead of custom implementations',
      avoidFactoryPattern: 'Avoid factory patterns. Use direct instantiation or platform DI',
      avoidCustomValidation: 'Use Zod schemas directly instead of custom validation wrappers',
      preferPlatformHooks: 'Use React 19 built-in hooks instead of custom state management',
      missingSupabaseErrorHandling: 'Supabase operations must check for errors: if (error) { ... }',
      missingSupabaseNullCheck: 'Check if data exists before accessing: data?.length or data || []',
      bypassingRepositoryPattern: 'Use repository methods instead of direct Supabase calls in services/controllers',
      directRPCInService: 'RPC calls should only be in repositories. Use repository methods in services.',
      missingInputValidation: 'Controller methods with user input must validate using Zod schemas',
      missingErrorBoundary: 'Async functions with external calls must have try/catch error handling',
      missingPagination: 'Public endpoints should use pagination (.limit() and .range())',
      nPlusOneQuery: 'Avoid database queries inside loops. Use batch operations or joins.',
      selectAllLargeTable: 'Avoid SELECT * on large tables. Specify needed columns.'
    }
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedWrappers = options.allowedWrappers || ['toast', 'createClient'];
    const filename = context.getFilename();
    
    // Native pattern mappings
    const nativeAlternatives = {
      // Supabase patterns
      'createCustomClient': 'createBrowserClient from @supabase/ssr',
      'supabaseWrapper': 'direct supabase method calls',
      
      // React Query patterns  
      'useCustomQuery': 'useQuery from @tanstack/react-query',
      'useCustomMutation': 'useMutation from @tanstack/react-query',
      
      // State management
      'createCustomStore': 'create from zustand',
      'useCustomState': 'useState or useReducer',
      
      // UI patterns
      'CustomButton': 'Button from @radix-ui with asChild',
      'CustomDialog': 'Dialog from @radix-ui primitives',
      
      // HTTP clients
      'customFetch': 'native fetch API',
      'apiWrapper': 'direct API calls with error handling'
    };

    function isAllowedWrapper(name) {
      return allowedWrappers.some(allowed => name.includes(allowed));
    }

    function reportNativeAlternative(node, messageId, suggestion) {
      context.report({
        node,
        messageId,
        data: { suggestion },
        fix(fixer) {
          // Provide simple fixes where possible
          if (messageId === 'useNativeFetch' && node.callee?.name === 'axios') {
            return fixer.replaceText(node.callee, 'fetch');
          }
          return null;
        }
      });
    }

    // SMART DETECTION HELPERS FOR REAL ARCHITECTURE ISSUES

    function isSupabaseCall(node) {
      if (node.type !== 'AwaitExpression' || !node.argument?.callee) return false
      const callChain = context.getSourceCode().getText(node.argument)
      return callChain.includes('.from(') || callChain.includes('.rpc(') || callChain.includes('supabase')
    }

    function hasErrorHandling(node) {
      // Look for destructuring with error: { data, error }
      let parent = node.parent
      while (parent && parent.type !== 'Program') {
        if (parent.type === 'VariableDeclarator' && parent.id?.type === 'ObjectPattern') {
          const hasErrorProp = parent.id.properties.some(prop =>
            prop.key?.name === 'error'
          )
          if (hasErrorProp) {
            // Check if error is handled in the same scope
            return hasErrorCheckInScope(parent)
          }
        }
        parent = parent.parent
      }
      return false
    }

    function hasErrorCheckInScope(node) {
      const scope = context.getScope()
      const sourceCode = context.getSourceCode()
      const blockParent = findBlockParent(node)
      if (!blockParent) return false

      const blockText = sourceCode.getText(blockParent)
      return /if\s*\(\s*error\s*\)/.test(blockText) || /error\s*&&/.test(blockText)
    }

    function findBlockParent(node) {
      let parent = node.parent
      while (parent) {
        if (parent.type === 'BlockStatement' || parent.type === 'Program') {
          return parent
        }
        parent = parent.parent
      }
      return null
    }

    function isSupabaseDataAccess(node) {
      if (node.type !== 'MemberExpression') return false
      return node.property?.name === 'length' ||
             node.property?.name === 'map' ||
             node.property?.name === 'filter'
    }

    function hasNullCheck(node) {
      // Check for optional chaining or null checks
      return node.optional ||
             node.object?.type === 'LogicalExpression' ||
             context.getSourceCode().getText(node).includes('?.') ||
             context.getSourceCode().getText(node).includes('|| []')
    }

    function isRepositoryFile(filename) {
      return filename.includes('repository') ||
             filename.includes('/repositories/')
    }

    function isServiceOrController(filename) {
      return filename.includes('.service.') ||
             filename.includes('.controller.') ||
             filename.includes('/services/') ||
             filename.includes('/controllers/')
    }

    function isControllerMethod(node) {
      // Check if this is a method in a controller class
      return node.type === 'MethodDefinition' &&
             filename.includes('.controller.') &&
             node.decorators?.some(decorator =>
               decorator.expression?.callee?.name === 'Post' ||
               decorator.expression?.callee?.name === 'Get' ||
               decorator.expression?.callee?.name === 'Put' ||
               decorator.expression?.callee?.name === 'Delete'
             )
    }

    return {
      // Check for custom Supabase wrappers
      'CallExpression[callee.name=/^(createCustom|supabase).*Client$/]'(node) {
        if (filename.includes('supabase') && !isAllowedWrapper(node.callee.name)) {
          reportNativeAlternative(node, 'useNativeSupabase', nativeAlternatives.createCustomClient);
        }
      },

      // Check for custom React Query wrappers
      'CallExpression[callee.name=/^use.*Query$|^use.*Mutation$/]'(node) {
        const name = node.callee.name;
        if (name.startsWith('useCustom') || (name.includes('Api') && !name.startsWith('useQuery'))) {
          reportNativeAlternative(node, 'useNativeReactQuery', nativeAlternatives.useCustomQuery);
        }
      },

      // Check for factory patterns
      'CallExpression[callee.name=/^create.*Factory$|^make.*$/]'(node) {
        if (!filename.includes('test') && !isAllowedWrapper(node.callee.name)) {
          reportNativeAlternative(node, 'avoidFactoryPattern', 'direct instantiation or dependency injection');
        }
      },

      // Check for custom HTTP clients (allow api-client.ts)
      'CallExpression[callee.name=/^(axios|request|httpClient)$/]'(node) {
        if (!filename.includes('api-client') && !filename.includes('packages/shared')) {
          reportNativeAlternative(node, 'useNativeFetch', nativeAlternatives.customFetch);
        }
      },

      // Check for custom validation wrappers
      'CallExpression[callee.name=/^validate|^check|^verify/]'(node) {
        const parent = node.parent;
        if (parent?.type === 'VariableDeclarator' || parent?.type === 'AssignmentExpression') {
          const sourceCode = context.getSourceCode();
          const text = sourceCode.getText(node);
          
          if (!text.includes('z.') && !text.includes('zod')) {
            reportNativeAlternative(node, 'avoidCustomValidation', 'Zod schema validation');
          }
        }
      },

      // Check for custom React components that should use Radix
      'VariableDeclarator[id.name=/^Custom.*Component$|^.*Wrapper$/]'(node) {
        if (node.init?.type === 'ArrowFunctionExpression' || node.init?.type === 'FunctionExpression') {
          const sourceCode = context.getSourceCode();
          const componentBody = sourceCode.getText(node.init);
          
          // Check if it's reimplementing common UI patterns
          const uiPatterns = ['onClick', 'onKeyDown', 'role=', 'aria-'];
          if (uiPatterns.some(pattern => componentBody.includes(pattern))) {
            reportNativeAlternative(node, 'useNativeRadix', 'Radix primitives with composition');
          }
        }
      },

      // Check for custom CSS abstractions
      'TemplateLiteral'(node) {
        if (filename.includes('.tsx') || filename.includes('.ts')) {
          const sourceCode = context.getSourceCode();
          const template = sourceCode.getText(node);
          
          // Look for CSS-in-JS patterns that should use Tailwind
          if (template.includes('background:') || template.includes('color:') || template.includes('padding:')) {
            const parent = node.parent;
            if (parent?.type === 'VariableDeclarator' && parent.id.name.includes('Style')) {
              reportNativeAlternative(node, 'useNativeTailwind', 'Tailwind utility classes');
            }
          }
        }
      },

      // Check for custom state management beyond allowed patterns
      'CallExpression[callee.name=/^create.*Store$|^use.*Store$/]'(node) {
        const name = node.callee.name;
        if (!name.includes('zustand') && !name.includes('useState') && !isAllowedWrapper(name)) {
          reportNativeAlternative(node, 'useNativeZustand', 'Zustand create() or native React hooks');
        }
      },

      // Check for React 18 patterns that should use React 19 features
      'CallExpression[callee.name="useEffect"]'(node) {
        if (node.arguments.length === 2 && node.arguments[1]?.type === 'ArrayExpression') {
          const deps = node.arguments[1].elements;
          if (deps.length === 0) {
            // Empty dependency array might be replaced with React 19 features
            const sourceCode = context.getSourceCode();
            const effectBody = sourceCode.getText(node.arguments[0]);

            if (effectBody.includes('fetch') || effectBody.includes('load')) {
              reportNativeAlternative(node, 'preferPlatformHooks', 'React 19 use() hook for data fetching');
            }
          }
        }
      },

      // SMART SUPABASE ERROR HANDLING DETECTION
      AwaitExpression(node) {
        if (isSupabaseCall(node) && !hasErrorHandling(node)) {
          context.report({
            node,
            messageId: 'missingSupabaseErrorHandling'
          })
        }
      },

      // SMART SUPABASE DATA ACCESS DETECTION
      MemberExpression(node) {
        if (isSupabaseDataAccess(node) && !hasNullCheck(node)) {
          context.report({
            node,
            messageId: 'missingSupabaseNullCheck'
          })
        }
      },

      // REPOSITORY PATTERN ENFORCEMENT
      CallExpression(node) {
        const callText = context.getSourceCode().getText(node)

        // Flag direct Supabase usage outside repositories
        if ((callText.includes('.from(') || callText.includes('supabase')) &&
            isServiceOrController(filename) &&
            !isRepositoryFile(filename)) {
          context.report({
            node,
            messageId: 'bypassingRepositoryPattern'
          })
        }

        // Flag RPC calls outside repositories
        if (callText.includes('.rpc(') && !isRepositoryFile(filename)) {
          context.report({
            node,
            messageId: 'directRPCInService'
          })
        }

        // Performance: Check for missing pagination on public endpoints
        if (callText.includes('.select(') &&
            !callText.includes('.limit(') &&
            isControllerMethod(node.parent)) {
          context.report({
            node,
            messageId: 'missingPagination'
          })
        }

        // Performance: Check for SELECT * on large tables
        if (callText.includes('.select(\'*\')') || callText.includes('.select("*")')) {
          const tableMatch = callText.match(/\.from\(['"`](\w+)['"`]\)/)
          const tableName = tableMatch?.[1]
          const largeTables = ['Activity', 'RentPayment', 'MaintenanceRequest', 'Lease']

          if (tableName && largeTables.includes(tableName)) {
            context.report({
              node,
              messageId: 'selectAllLargeTable'
            })
          }
        }
      },

      // N+1 QUERY DETECTION
      'ForStatement > BlockStatement CallExpression, ForInStatement > BlockStatement CallExpression, ForOfStatement > BlockStatement CallExpression'(node) {
        const callText = context.getSourceCode().getText(node)
        if (callText.includes('supabase') || callText.includes('.from(')) {
          context.report({
            node,
            messageId: 'nPlusOneQuery'
          })
        }
      },

      // MISSING ERROR BOUNDARIES
      'FunctionDeclaration[async=true], ArrowFunctionExpression[async=true]'(node) {
        const sourceCode = context.getSourceCode()
        const functionBody = sourceCode.getText(node.body || node)

        const hasExternalCalls = functionBody.includes('supabase') ||
                                functionBody.includes('fetch') ||
                                functionBody.includes('await')

        const hasTryCatch = functionBody.includes('try') && functionBody.includes('catch')

        if (hasExternalCalls && !hasTryCatch && isServiceOrController(filename)) {
          context.report({
            node,
            messageId: 'missingErrorBoundary'
          })
        }
      }
    };
  }
};