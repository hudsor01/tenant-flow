/**
 * Custom ESLint Rules for Anti-Duplication (DRY/KISS Enforcement)
 * 
 * These rules detect patterns that violate DRY principles and suggest consolidation.
 * Built specifically for TenantFlow's architecture patterns.
 */

/**
 * Rule: no-duplicate-function-implementations
 * Detects functions with identical or very similar implementations
 */
const noDuplicateFunctionImplementations = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detect duplicate function implementations that should be consolidated',
      category: 'DRY Violations',
      recommended: true
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          similarity: {
            type: 'number',
            minimum: 0.5,
            maximum: 1.0,
            default: 0.8
          },
          minLength: {
            type: 'number',
            minimum: 3,
            default: 5
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      duplicateFunction: 'Function "{{name}}" has a similar implementation to "{{similar}}" ({{similarity}}% match). Consider consolidating into a shared utility.'
    }
  },
  
  create(context) {
    const functions = new Map();
    const options = context.options[0] || {};
    const similarityThreshold = options.similarity || 0.8;
    const minLength = options.minLength || 5;
    
    function normalizeCode(code) {
      return code
        .replace(/\s+/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .trim();
    }
    
    function calculateSimilarity(str1, str2) {
      if (str1.length < minLength || str2.length < minLength) return 0;
      
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      
      if (longer.length === 0) return 1.0;
      
      const distance = levenshteinDistance(longer, shorter);
      return (longer.length - distance) / longer.length;
    }
    
    function levenshteinDistance(str1, str2) {
      const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
      
      for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
      
      for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
          const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1,
            matrix[j - 1][i - 1] + cost
          );
        }
      }
      
      return matrix[str2.length][str1.length];
    }
    
    function checkForDuplicates(node, name, code) {
      for (const [existingName, existingData] of functions) {
        if (existingName === name) continue;
        
        const similarity = calculateSimilarity(code, existingData.code);
        
        if (similarity >= similarityThreshold) {
          context.report({
            node,
            messageId: 'duplicateFunction',
            data: {
              name,
              similar: existingName,
              similarity: Math.round(similarity * 100)
            }
          });
        }
      }
    }
    
    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node) {
        const name = node.id?.name || 
                    (node.parent?.id?.name) || 
                    (node.parent?.key?.name) || 
                    'anonymous';
        
        const sourceCode = context.getSourceCode();
        const code = normalizeCode(sourceCode.getText(node.body || node));
        
        if (code.length >= minLength) {
          checkForDuplicates(node, name, code);
          functions.set(name, { node, code });
        }
      }
    };
  }
};

/**
 * Rule: no-repeated-config-patterns
 * Detects repeated configuration objects that should be consolidated
 */
const noRepeatedConfigPatterns = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detect repeated configuration patterns',
      category: 'DRY Violations',
      recommended: true
    },
    schema: [],
    messages: {
      repeatedConfig: 'Configuration pattern repeated {{count}} times. Consider extracting to shared constant: {{pattern}}'
    }
  },
  
  create(context) {
    const configPatterns = new Map();
    
    function isConfigObject(node) {
      // Detect common config patterns
      const configKeywords = [
        'config', 'options', 'settings', 'params',
        'queryKey', 'queryFn', 'staleTime', 'gcTime',
        'headers', 'method', 'body'
      ];
      
      if (node.type === 'ObjectExpression' && node.properties.length > 2) {
        return node.properties.some(prop => 
          prop.key && configKeywords.some(keyword => 
            prop.key.name?.toLowerCase().includes(keyword)
          )
        );
      }
      return false;
    }
    
    function normalizeObject(node) {
      const sourceCode = context.getSourceCode();
      return sourceCode.getText(node)
        .replace(/\s+/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .trim();
    }
    
    return {
      ObjectExpression(node) {
        if (isConfigObject(node)) {
          const pattern = normalizeObject(node);
          
          if (!configPatterns.has(pattern)) {
            configPatterns.set(pattern, []);
          }
          
          configPatterns.get(pattern).push(node);
        }
      },
      
      'Program:exit'() {
        for (const [pattern, nodes] of configPatterns) {
          if (nodes.length >= 3) {
            nodes.forEach(node => {
              context.report({
                node,
                messageId: 'repeatedConfig',
                data: {
                  count: nodes.length,
                  pattern: pattern.substring(0, 50) + '...'
                }
              });
            });
          }
        }
      }
    };
  }
};

/**
 * Rule: no-similar-api-endpoints
 * Detects API endpoints with similar patterns that could be consolidated
 */
const noSimilarApiEndpoints = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detect similar API endpoint patterns',
      category: 'DRY Violations',
      recommended: true
    },
    schema: [],
    messages: {
      similarEndpoint: 'API endpoint pattern "{{pattern}}" is similar to existing pattern. Consider using a generic endpoint builder.'
    }
  },
  
  create(context) {
    const endpoints = new Set();
    const patterns = new Map();
    
    function extractEndpointPattern(str) {
      // Convert specific IDs to generic patterns
      return str
        .replace(/\/[a-f0-9-]{36}/g, '/:id') // UUIDs
        .replace(/\/\d+/g, '/:id') // Numeric IDs
        .replace(/\/\$\{[^}]+\}/g, '/:param') // Template literals
        .replace(/`[^`]*`/g, '') // Remove template literal quotes
    }
    
    return {
      'CallExpression[callee.name=/^(get|post|put|delete|patch)$/]'(node) {
        if (node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          if (firstArg.type === 'Literal' || firstArg.type === 'TemplateLiteral') {
            const sourceCode = context.getSourceCode();
            const endpoint = sourceCode.getText(firstArg);
            const pattern = extractEndpointPattern(endpoint);
            
            if (!patterns.has(pattern)) {
              patterns.set(pattern, []);
            }
            patterns.get(pattern).push({ node, endpoint });
          }
        }
      },
      
      'Program:exit'() {
        for (const [pattern, occurrences] of patterns) {
          if (occurrences.length >= 3) {
            occurrences.forEach(({ node, endpoint }) => {
              context.report({
                node,
                messageId: 'similarEndpoint',
                data: { pattern }
              });
            });
          }
        }
      }
    };
  }
};

/**
 * Rule: no-repeated-component-logic
 * Detects React components with repeated logic patterns
 */
const noRepeatedComponentLogic = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detect repeated component logic that should be extracted to hooks',
      category: 'DRY Violations',
      recommended: true
    },
    schema: [],
    messages: {
      repeatedHookPattern: 'Hook pattern "{{pattern}}" repeated {{count}} times. Consider creating a custom hook.',
      repeatedStateLogic: 'State management pattern repeated. Consider extracting to custom hook: {{pattern}}'
    }
  },
  
  create(context) {
    const hookPatterns = new Map();
    const statePatterns = new Map();
    
    function normalizeHookUsage(node) {
      const sourceCode = context.getSourceCode();
      return sourceCode.getText(node)
        .replace(/\s+/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .trim();
    }
    
    return {
      'CallExpression[callee.name=/^use[A-Z]/]'(node) {
        // Track React hook usage patterns
        if (node.callee.name.startsWith('use')) {
          const pattern = normalizeHookUsage(node);
          
          if (!hookPatterns.has(pattern)) {
            hookPatterns.set(pattern, []);
          }
          hookPatterns.get(pattern).push(node);
        }
      },
      
      'VariableDeclarator[init.type="CallExpression"][init.callee.name="useState"]'(node) {
        // Track useState patterns
        const sourceCode = context.getSourceCode();
        const pattern = sourceCode.getText(node).replace(/\s+/g, ' ');
        
        if (!statePatterns.has(pattern)) {
          statePatterns.set(pattern, []);
        }
        statePatterns.get(pattern).push(node);
      },
      
      'Program:exit'() {
        // Report repeated hook patterns
        for (const [pattern, nodes] of hookPatterns) {
          if (nodes.length >= 4) {
            nodes.forEach(node => {
              context.report({
                node,
                messageId: 'repeatedHookPattern',
                data: {
                  pattern: pattern.substring(0, 40) + '...',
                  count: nodes.length
                }
              });
            });
          }
        }
        
        // Report repeated state patterns
        for (const [pattern, nodes] of statePatterns) {
          if (nodes.length >= 3) {
            nodes.forEach(node => {
              context.report({
                node,
                messageId: 'repeatedStateLogic',
                data: {
                  pattern: pattern.substring(0, 40) + '...'
                }
              });
            });
          }
        }
      }
    };
  }
};

export default {
  rules: {
    'no-duplicate-function-implementations': noDuplicateFunctionImplementations,
    'no-repeated-config-patterns': noRepeatedConfigPatterns,  
    'no-similar-api-endpoints': noSimilarApiEndpoints,
    'no-repeated-component-logic': noRepeatedComponentLogic,
    'no-wrapper-only': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow wrapper-only functions/components that add no behavior',
          category: 'Best Practices',
          recommended: false
        },
        schema: [
          {
            type: 'object',
            properties: {
              allowMarker: { type: 'string', default: '@wrapper-allowed' },
              minLines: { type: 'number', default: 1 }
            },
            additionalProperties: false
          }
        ],
        messages: {
          wrapperOnly:
            'Wrapper-only {{kind}} detected. Prefer parameterized utility/factory or direct composition instead.'
        }
      },
      create(context) {
        const options = context.options[0] || {}
        const allowMarker = options.allowMarker || '@wrapper-allowed'
        const minLines = typeof options.minLines === 'number' ? options.minLines : 1

        function hasAllowMarker(node) {
          const src = context.getSourceCode()
          const comments = src.getCommentsBefore(node)
          return comments?.some(c => c.value.includes(allowMarker)) || false
        }

        function isParamsMirror(params, arg) {
          // Identifier referencing a param
          if (arg.type === 'Identifier') {
            return params.some(p => p.type === 'Identifier' && p.name === arg.name)
          }
          // Spread of props: ...props
          if (arg.type === 'SpreadElement' && arg.argument.type === 'Identifier') {
            return params.some(p => p.type === 'Identifier' && p.name === arg.argument.name)
          }
          // Object with literal or param value
          if (arg.type === 'ObjectExpression') {
            return arg.properties.every(p => {
              if (p.type !== 'Property') return false
              const v = p.value
              if (v.type === 'Literal') return true
              if (v.type === 'Identifier') return params.some(pp => pp.type === 'Identifier' && pp.name === v.name)
              return false
            })
          }
          return false
        }

        function bodyIsSingleReturn(block) {
          if (block.type !== 'BlockStatement') return false
          const body = block.body.filter(s => s.type !== 'EmptyStatement')
          return body.length === 1 && body[0].type === 'ReturnStatement'
        }

        function isWrapperOnlyFunction(node) {
          const src = context.getSourceCode()
          const text = src.getText(node)
          if (text.split('\n').length < minLines) return false

          if (node.type === 'ArrowFunctionExpression' && node.expression) {
            // Concise body: () => expr
            const expr = node.body
            if (expr.type === 'CallExpression') {
              return expr.arguments.every(arg => isParamsMirror(node.params, arg))
            }
            if (expr.type === 'JSXElement') {
              // JSX wrapper check on attributes only
              const attrs = expr.openingElement.attributes
              return attrs.every(a =>
                (a.type === 'JSXSpreadAttribute' && a.argument.type === 'Identifier' &&
                  node.params.some(p => p.type === 'Identifier' && p.name === a.argument.name)) ||
                (a.type === 'JSXAttribute' && (
                  (a.value && a.value.type === 'Literal') ||
                  (a.value && a.value.type === 'JSXExpressionContainer' && a.value.expression.type === 'Identifier' &&
                    node.params.some(p => p.type === 'Identifier' && p.name === a.value.expression.name))
                ))
              )
            }
            return false
          }

          if (node.body && bodyIsSingleReturn(node.body)) {
            const ret = node.body.body[0]
            const arg = ret.argument
            if (!arg) return false
            if (arg.type === 'CallExpression') {
              return arg.arguments.every(a => isParamsMirror(node.params, a))
            }
            if (arg.type === 'JSXElement') {
              const attrs = arg.openingElement.attributes
              return attrs.every(a =>
                (a.type === 'JSXSpreadAttribute' && a.argument.type === 'Identifier' &&
                  node.params.some(p => p.type === 'Identifier' && p.name === a.argument.name)) ||
                (a.type === 'JSXAttribute' && (
                  (a.value && a.value.type === 'Literal') ||
                  (a.value && a.value.type === 'JSXExpressionContainer' && a.value.expression.type === 'Identifier' &&
                    node.params.some(p => p.type === 'Identifier' && p.name === a.value.expression.name))
                ))
              )
            }
          }
          return false
        }

        function report(node, kind) {
          context.report({ node, messageId: 'wrapperOnly', data: { kind } })
        }

        return {
          'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node) {
            if (hasAllowMarker(node)) return
            if (isWrapperOnlyFunction(node)) {
              report(node, node.type === 'ArrowFunctionExpression' ? 'arrow-function' : 'function')
            }
          }
        }
      }
    }
  }
};
