/**
 * ESLint Rule: no-admin-client-bypass
 *
 * Prevents usage of getAdminClient() which bypasses Row Level Security (RLS).
 *
 * WHY: getAdminClient() bypasses RLS policies, creating security vulnerabilities
 * in multi-tenant applications. Use getUserClient(token) instead to respect RLS.
 *
 * WHEN TO ALLOW: Only for:
 * - Webhook handlers (no user context)
 * - System maintenance tasks
 * - Background jobs with explicit admin privileges
 *
 * Must be explicitly disabled with eslint-disable comment + justification.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent usage of getAdminClient() which bypasses RLS',
      category: 'Security',
      recommended: true,
      url: 'https://github.com/your-org/tenant-flow/docs/rls-security.md'
    },
    messages: {
      noAdminClient: [
        'Avoid getAdminClient() - it bypasses Row Level Security (RLS).',
        'Use getUserClient(token) instead to respect RLS policies.',
        'If admin access is truly required (webhooks, system tasks),',
        'add eslint-disable comment with justification:',
        '// eslint-disable-next-line no-admin-client-bypass -- Reason: Stripe webhook with no user context'
      ].join('\n'),
      noDirectAdminCall: [
        'Direct supabase admin client usage bypasses RLS.',
        'Use supabase.getUserClient(token) for user-scoped operations.'
      ].join('\n')
    },
    schema: []
  },

  create(context) {
    // Whitelist: Files where admin client usage is legitimate
    const legitimateAdminClientFiles = [
      /stripe-webhook\.service\.ts$/,      // Webhooks have no user context
      /stripe-data\.service\.ts$/,         // System-level Stripe data sync
      /subscriptions\.service\.ts$/,       // Stripe billing operations (no user-scoped queries)
      /users\.service\.ts$/,               // User management by admin
      /security-metrics\.service\.ts$/,    // System monitoring
      /storage\.service\.ts$/,             // File storage operations
      /utility\.service\.ts$/              // System utilities
    ]

    return {
      // Check for: getAdminClient()
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property &&
          node.callee.property.name === 'getAdminClient'
        ) {
          const filename = context.getFilename()

          // Allow if file is in whitelist
          const isLegitimate = legitimateAdminClientFiles.some(pattern =>
            pattern.test(filename)
          )

          if (isLegitimate) {
            return // Skip check for whitelisted files
          }

          // Allow if explicitly disabled with comment
          const comments = context.getSourceCode().getCommentsBefore(node)
          const hasJustification = comments.some(comment =>
            comment.value.includes('eslint-disable') &&
            comment.value.includes('no-admin-client-bypass') &&
            comment.value.includes('Reason:')
          )

          if (!hasJustification) {
            context.report({
              node: node.callee.property,
              messageId: 'noAdminClient'
            })
          }
        }

        // Check for: supabase.from() direct calls
        // (should use client.from() after getUserClient())
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property &&
          node.callee.property.name === 'from' &&
          node.callee.object.type === 'MemberExpression' &&
          node.callee.object.property &&
          node.callee.object.property.name === 'supabase'
        ) {
          // Check if this is a direct admin client usage pattern
          const parent = node.parent
          if (
            parent &&
            parent.type === 'MemberExpression' &&
            !parent.object.callee // Not a result of getUserClient()
          ) {
            context.report({
              node: node.callee.property,
              messageId: 'noDirectAdminCall'
            })
          }
        }
      },

      // Check for variable assignments like: const admin = supabase.getAdminClient()
      VariableDeclarator(node) {
        if (
          node.init &&
          node.init.type === 'CallExpression' &&
          node.init.callee.type === 'MemberExpression' &&
          node.init.callee.property &&
          node.init.callee.property.name === 'getAdminClient'
        ) {
          const filename = context.getFilename()

          // Allow if file is in whitelist
          const isLegitimate = legitimateAdminClientFiles.some(pattern =>
            pattern.test(filename)
          )

          if (isLegitimate) {
            return // Skip check for whitelisted files
          }

          const comments = context.getSourceCode().getCommentsBefore(node.parent)
          const hasJustification = comments.some(comment =>
            comment.value.includes('eslint-disable') &&
            comment.value.includes('no-admin-client-bypass') &&
            comment.value.includes('Reason:')
          )

          if (!hasJustification) {
            context.report({
              node: node.init.callee.property,
              messageId: 'noAdminClient'
            })
          }
        }
      }
    }
  }
}
