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
      preferPlatformHooks: 'Use React 19 built-in hooks instead of custom state management'
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
      }
    };
  }
};