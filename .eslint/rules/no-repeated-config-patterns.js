/**
 * ESLint Rule: no-repeated-config-patterns
 * 
 * Prevents repeated configuration patterns to enforce DRY principles.
 * Detects similar configuration objects, repeated option patterns,
 * or duplicate setup code that should be centralized.
 * 
 * CLAUDE.md Compliance: DRY principle - eliminates configuration duplication
 * 
 * Examples of violations:
 * - Similar configuration objects across files
 * - Repeated API client setup patterns
 * - Duplicate middleware configurations
 * - Similar database connection patterns
 */

const createRule = (config) => config

export default createRule({
  name: 'no-repeated-config-patterns',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevents repeated configuration patterns',
      recommended: 'warn'
    },
    messages: {
      repeatedConfig: 'Repeated configuration pattern detected. Consider extracting to shared config.',
      similarOptions: 'Similar configuration options detected: "{{config1}}" and "{{config2}}". Consider consolidating.',
      duplicateSetup: 'Duplicate setup pattern detected. Consider creating a shared utility function.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const configs = []
    const setupPatterns = []
    
    return {
      // Collect object expressions that look like configurations
      ObjectExpression(node) {
        const parent = node.parent
        
        // Look for configuration-like patterns
        if (isConfigurationObject(node, parent)) {
          configs.push({
            node,
            content: context.getSourceCode().getText(node),
            properties: node.properties.map(prop => {
              if (prop.key && prop.key.name) {
                return prop.key.name
              }
              return null
            }).filter(Boolean)
          })
        }
      },

      // Collect variable declarations that might be configurations
      VariableDeclarator(node) {
        if (node.id && node.id.type === 'Identifier' && node.init) {
          const name = node.id.name.toLowerCase()
          
          if (name.includes('config') || name.includes('options') || 
              name.includes('settings') || name.includes('setup')) {
            setupPatterns.push({
              node,
              name: node.id.name,
              content: context.getSourceCode().getText(node.init)
            })
          }
        }
      },

      'Program:exit'() {
        // Check for similar configuration objects
        for (let i = 0; i < configs.length; i++) {
          for (let j = i + 1; j < configs.length; j++) {
            const config1 = configs[i]
            const config2 = configs[j]
            
            const similarity = calculateConfigSimilarity(config1, config2)
            
            if (similarity > 0.7) { // 70% similarity threshold
              context.report({
                node: config2.node,
                messageId: 'repeatedConfig'
              })
            }
          }
        }

        // Check for similar setup patterns
        for (let i = 0; i < setupPatterns.length; i++) {
          for (let j = i + 1; j < setupPatterns.length; j++) {
            const pattern1 = setupPatterns[i]
            const pattern2 = setupPatterns[j]
            
            const similarity = calculateStringSimilarity(pattern1.content, pattern2.content)
            
            if (similarity > 0.8) { // 80% similarity for setup patterns
              context.report({
                node: pattern2.node,
                messageId: 'similarOptions',
                data: {
                  config1: pattern1.name,
                  config2: pattern2.name
                }
              })
            }
          }
        }
      }
    }

    function isConfigurationObject(node, parent) {
      // Check if this looks like a configuration object
      if (node.properties.length < 2) return false
      
      // Check for common configuration property names
      const configKeys = node.properties
        .map(prop => prop.key && prop.key.name)
        .filter(Boolean)
        .map(key => key.toLowerCase())
      
      const commonConfigKeys = [
        'host', 'port', 'url', 'api', 'endpoint', 'baseurl',
        'timeout', 'retry', 'retries', 'maxretries',
        'headers', 'auth', 'authentication', 'credentials',
        'ssl', 'https', 'secure', 'cert', 'key',
        'cache', 'ttl', 'expiry', 'expires',
        'debug', 'verbose', 'logging', 'log',
        'env', 'environment', 'mode', 'production',
        'database', 'db', 'connection', 'pool',
        'redis', 'mongodb', 'postgres', 'mysql'
      ]
      
      const matchingKeys = configKeys.filter(key => 
        commonConfigKeys.some(configKey => key.includes(configKey))
      )
      
      return matchingKeys.length >= 2
    }

    function calculateConfigSimilarity(config1, config2) {
      // Compare property names (structure similarity)
      const props1 = new Set(config1.properties)
      const props2 = new Set(config2.properties)
      
      const intersection = new Set([...props1].filter(x => props2.has(x)))
      const union = new Set([...props1, ...props2])
      
      const structureSimilarity = intersection.size / union.size
      
      // Compare content similarity
      const contentSimilarity = calculateStringSimilarity(config1.content, config2.content)
      
      // Weighted average (structure is more important for configs)
      return (structureSimilarity * 0.6) + (contentSimilarity * 0.4)
    }
  }
})

function calculateStringSimilarity(str1, str2) {
  // Simple token-based similarity
  const tokens1 = new Set(str1.split(/\W+/).filter(t => t.length > 2))
  const tokens2 = new Set(str2.split(/\W+/).filter(t => t.length > 2))
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)))
  const union = new Set([...tokens1, ...tokens2])
  
  return intersection.size / union.size
}