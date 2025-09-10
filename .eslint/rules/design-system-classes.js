import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const cssValidator = require('../css-class-validator.cjs');

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce design system consistency by only allowing CSS classes from globals.css and dashboard.css',
      category: 'Stylistic Issues',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      invalidClass: 'CSS class "{{ className }}" is not defined in your design system (globals.css or dashboard.css)',
      multipleInvalidClasses: 'CSS classes {{ classNames }} are not defined in your design system',
      deprecatedClass: 'CSS class "{{ className }}" uses deprecated Tailwind v3 syntax. Update to Tailwind v4 equivalent.',
      multipleDeprecatedClasses: 'CSS classes {{ classNames }} use deprecated Tailwind v3 syntax. Update to Tailwind v4 equivalents.',
    },
  },

  create(context) {
    function checkClassNames(node, classValue) {
      if (typeof classValue !== 'string') return;

      const result = cssValidator.validateClassesWithDetails(classValue);
      
      // Handle deprecated classes
      if (result.deprecated.length > 0) {
        if (result.deprecated.length === 1) {
          context.report({
            node,
            messageId: 'deprecatedClass',
            data: {
              className: result.deprecated[0],
            },
          });
        } else {
          context.report({
            node,
            messageId: 'multipleDeprecatedClasses',
            data: {
              classNames: result.deprecated.map(cls => `"${cls}"`).join(', '),
            },
          });
        }
      }
      
      // Handle invalid classes
      if (result.invalid.length > 0) {
        if (result.invalid.length === 1) {
          context.report({
            node,
            messageId: 'invalidClass',
            data: {
              className: result.invalid[0],
            },
          });
        } else {
          context.report({
            node,
            messageId: 'multipleInvalidClasses',
            data: {
              classNames: result.invalid.map(cls => `"${cls}"`).join(', '),
            },
          });
        }
      }
    }

    function checkJSXAttribute(node) {
      if (node.name.name === 'className' && node.value) {
        if (node.value.type === 'Literal') {
          checkClassNames(node, node.value.value);
        } else if (node.value.type === 'JSXExpressionContainer') {
          // Handle template literals and string concatenations
          const expression = node.value.expression;
          if (expression.type === 'TemplateLiteral') {
            expression.quasis.forEach(quasi => {
              if (quasi.value.cooked) {
                checkClassNames(node, quasi.value.cooked);
              }
            });
          } else if (expression.type === 'Literal' && typeof expression.value === 'string') {
            checkClassNames(node, expression.value);
          } else if (expression.type === 'CallExpression') {
            // Handle cn() function calls - common pattern in the project
            if (expression.callee && expression.callee.name === 'cn') {
              expression.arguments.forEach(arg => {
                if (arg.type === 'Literal' && typeof arg.value === 'string') {
                  checkClassNames(node, arg.value);
                } else if (arg.type === 'TemplateLiteral') {
                  arg.quasis.forEach(quasi => {
                    if (quasi.value.cooked) {
                      checkClassNames(node, quasi.value.cooked);
                    }
                  });
                }
              });
            }
          }
        }
      }
    }

    return {
      JSXAttribute: checkJSXAttribute,
    };
  },
};