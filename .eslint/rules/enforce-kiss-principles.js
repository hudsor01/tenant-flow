/**
 * ESLint rule to enforce KISS (Keep It Simple, Stupid) principles
 * Detects unnecessarily complex patterns and suggests simpler alternatives
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce KISS principles by flagging unnecessarily complex patterns',
      category: 'Best Practices', 
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          maxComplexity: {
            type: 'number',
            default: 10,
            description: 'Maximum cyclomatic complexity allowed'
          },
          maxNestingDepth: {
            type: 'number',
            default: 4,
            description: 'Maximum nesting depth allowed'
          },
          maxParameterCount: {
            type: 'number',
            default: 5,
            description: 'Maximum function parameters allowed'
          },
          maxFunctionLength: {
            type: 'number',
            default: 50,
            description: 'Maximum function length in lines'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      tooComplex: 'Function complexity ({{complexity}}) exceeds maximum ({{maxComplexity}}). Consider breaking into smaller functions.',
      tooNested: 'Code is nested too deeply ({{depth}} levels). Consider extracting functions or using early returns.',
      tooManyParams: 'Function has too many parameters ({{count}}). Consider using an options object.',
      tooLong: 'Function is too long ({{lines}} lines). Consider breaking into smaller functions.',
      unnecessaryTernary: 'Unnecessary ternary operator. Use simple conditional or boolean expression.',
      complexCondition: 'Complex conditional expression. Consider extracting to a named function.',
      deepObjectAccess: 'Deep object access. Consider using optional chaining or intermediate variables.',
      overEngineeredPattern: 'Over-engineered pattern detected: {{pattern}}. Consider simpler alternative: {{suggestion}}',
      redundantCode: 'Redundant code detected. This can be simplified.',
      prematureAbstraction: 'Premature abstraction detected. Consider keeping code simple until reuse is needed.',
      complexStateUpdate: 'Complex state update. Consider breaking into smaller state updates or using useReducer.',
      heavyDependencyChain: 'Heavy dependency chain detected. Consider simplifying dependencies.'
    }
  },

  create(context) {
    const options = context.options[0] || {};
    const maxComplexity = options.maxComplexity || 10;
    const maxNestingDepth = options.maxNestingDepth || 4;  
    const maxParameterCount = options.maxParameterCount || 5;
    const maxFunctionLength = options.maxFunctionLength || 50;

    let nestingDepth = 0;
    let currentFunctionComplexity = 1;

    function calculateFunctionLength(node) {
      const start = node.loc.start.line;
      const end = node.loc.end.line;
      return end - start + 1;
    }

    function isComplexConditional(node) {
      // Check for complex logical expressions
      if (node.type === 'LogicalExpression') {
        return countLogicalOperators(node) > 3;
      }
      return false;
    }

    function countLogicalOperators(node) {
      if (node.type !== 'LogicalExpression') return 0;
      return 1 + countLogicalOperators(node.left) + countLogicalOperators(node.right);
    }

    function isUnnecessaryTernary(node) {
      if (node.type !== 'ConditionalExpression') return false;
      
      const { consequent, alternate } = node;
      
      // Check for boolean ternary: condition ? true : false
      return (
        (consequent.type === 'Literal' && consequent.value === true &&
         alternate.type === 'Literal' && alternate.value === false) ||
        (consequent.type === 'Literal' && consequent.value === false &&
         alternate.type === 'Literal' && alternate.value === true)
      );
    }

    function checkOverEngineeredPatterns(node) {
      const sourceCode = context.getSourceCode();
      const text = sourceCode.getText(node);
      
      // Common over-engineered patterns
      const patterns = [
        {
          pattern: /\.reduce\(\(acc,\s*\w+\)\s*=>\s*{\s*acc\[\w+\]\s*=.*?;\s*return acc;\s*},\s*{}\)/,
          suggestion: 'Object.fromEntries() or simple loop',
          name: 'complex reduce for object creation'
        },
        {
          pattern: /useMemo\(\(\)\s*=>\s*[^,]+,\s*\[\]\)/,
          suggestion: 'constant variable outside component',
          name: 'unnecessary useMemo for constants'
        },
        {
          pattern: /useCallback\(\(\)\s*=>\s*[^,]+,\s*\[\]\)/,
          suggestion: 'function declaration outside component',  
          name: 'unnecessary useCallback for stable functions'
        },
        {
          pattern: /\.map\([^)]+\)\.filter\([^)]+\)/,
          suggestion: 'single reduce() or for loop',
          name: 'chained map/filter operations'
        }
      ];

      for (const { pattern, suggestion, name } of patterns) {
        if (pattern.test(text)) {
          context.report({
            node,
            messageId: 'overEngineeredPattern',
            data: { pattern: name, suggestion }
          });
          return true;
        }
      }
      return false;
    }

    function checkDeepObjectAccess(node) {
      if (node.type === 'MemberExpression') {
        let depth = 0;
        let current = node;
        
        while (current.type === 'MemberExpression') {
          depth++;
          current = current.object;
        }
        
        if (depth > 3) {
          context.report({
            node,
            messageId: 'deepObjectAccess'
          });
        }
      }
    }

    return {
      // Track nesting depth
      'BlockStatement, SwitchStatement'(node) {
        nestingDepth++;
        if (nestingDepth > maxNestingDepth) {
          context.report({
            node,
            messageId: 'tooNested',
            data: { depth: nestingDepth }
          });
        }
      },

      'BlockStatement:exit, SwitchStatement:exit'() {
        nestingDepth--;
      },

      // Check function complexity and length
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node) {
        currentFunctionComplexity = 1;
        
        // Check parameter count
        if (node.params.length > maxParameterCount) {
          context.report({
            node,
            messageId: 'tooManyParams',
            data: { count: node.params.length }
          });
        }
        
        // Check function length
        const length = calculateFunctionLength(node);
        if (length > maxFunctionLength) {
          context.report({
            node,
            messageId: 'tooLong', 
            data: { lines: length }
          });
        }

        // Check for over-engineered patterns
        checkOverEngineeredPatterns(node);
      },

      'FunctionDeclaration:exit, FunctionExpression:exit, ArrowFunctionExpression:exit'(node) {
        if (currentFunctionComplexity > maxComplexity) {
          context.report({
            node,
            messageId: 'tooComplex',
            data: { 
              complexity: currentFunctionComplexity,
              maxComplexity 
            }
          });
        }
      },

      // Track complexity-increasing statements
      'IfStatement, WhileStatement, DoWhileStatement, ForStatement, ForInStatement, ForOfStatement, SwitchStatement'() {
        currentFunctionComplexity++;
      },

      'LogicalExpression'(node) {
        if (isComplexConditional(node)) {
          context.report({
            node,
            messageId: 'complexCondition'
          });
        }
      },

      // Check for unnecessary ternary operators
      'ConditionalExpression'(node) {
        if (isUnnecessaryTernary(node)) {
          context.report({
            node,
            messageId: 'unnecessaryTernary'
          });
        }
      },

      // Check for deep object access
      'MemberExpression'(node) {
        checkDeepObjectAccess(node);
      },

      // Check for complex state updates in React
      'CallExpression[callee.name=/^set[A-Z]/]'(node) {
        if (node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
            const sourceCode = context.getSourceCode();
            const funcText = sourceCode.getText(arg);
            
            // Check if the state updater function is complex
            if (funcText.length > 100 || funcText.includes('switch') || funcText.includes('if')) {
              context.report({
                node,
                messageId: 'complexStateUpdate'
              });
            }
          }
        }
      },

      // Check for premature abstractions (single-use abstractions)
      'VariableDeclarator[id.name=/^(create|make|build|generate)[A-Z]/]'(node) {
        if (node.init && (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')) {
          // This is a heuristic - in practice, you'd want to analyze usage across files
          const sourceCode = context.getSourceCode();
          const funcName = node.id.name;
          const fileText = sourceCode.getText();
          
          // Count occurrences of the function name (simple heuristic)
          const occurrences = (fileText.match(new RegExp(funcName, 'g')) || []).length;
          
          if (occurrences <= 2) { // Once for declaration, once for usage = probably premature
            context.report({
              node,
              messageId: 'prematureAbstraction'
            });
          }
        }
      },

      // Check for redundant code patterns  
      'IfStatement > BlockStatement > ExpressionStatement:only-child > AssignmentExpression[operator="="]'(node) {
        const ifStatement = node.parent.parent.parent;
        
        // Check for pattern: if (condition) { variable = value; } else { variable = otherValue; }
        if (ifStatement.alternate && 
            ifStatement.alternate.type === 'BlockStatement' &&
            ifStatement.alternate.body.length === 1) {
          
          const elseStatement = ifStatement.alternate.body[0];
          if (elseStatement.type === 'ExpressionStatement' &&
              elseStatement.expression.type === 'AssignmentExpression' &&
              elseStatement.expression.left.name === node.left.name) {
            
            context.report({
              node: ifStatement,
              messageId: 'redundantCode'
            });
          }
        }
      }
    };
  }
};