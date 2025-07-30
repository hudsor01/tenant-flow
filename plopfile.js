const pluralize = require('pluralize')

module.exports = function (plop) {
  // Helper functions for string transformations
  plop.setHelper('pluralize', function (text) {
    return pluralize(text)
  })
  
  plop.setHelper('humanCase', function (text) {
    return text.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
  })
  
  plop.setHelper('sentenceCase', function (text) {
    return text.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase()).trim()
  })
  
  plop.setHelper('eq', function (a, b) {
    return a === b
  })
  
  plop.setHelper('unless', function (condition, options) {
    if (!condition) {
      return options.fn(this)
    }
    return options.inverse(this)
  })

  // CRUD Module Generator
  plop.setGenerator('crud-module', {
    description: 'Generate a complete CRUD module with DTOs, service, controller, and repository',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Module name (singular, e.g., MaintenanceRequest):',
        validate: function (value) {
          if (!value) return 'Module name is required'
          if (!/^[A-Z][a-zA-Z]*$/.test(value)) return 'Module name must be PascalCase (e.g., MaintenanceRequest)'
          return true
        }
      },
      {
        type: 'confirm',
        name: 'hasOwner',
        message: 'Does this entity have an ownerId field?',
        default: true
      },
      {
        type: 'confirm',
        name: 'hasUser',
        message: 'Does this entity have a userId field instead of ownerId?',
        default: false,
        when: function(answers) {
          return !answers.hasOwner
        }
      },
      {
        type: 'confirm',
        name: 'hasStatus',
        message: 'Does this entity have a status field with transitions?',
        default: false
      },
      {
        type: 'confirm',
        name: 'hasFile',
        message: 'Does this entity handle file operations?',
        default: false
      },
      {
        type: 'input',
        name: 'searchFields',
        message: 'Search fields (comma-separated, e.g., title,description):',
        filter: function(value) {
          return value.split(',').map(field => ({ name: field.trim() }))
        }
      },
      {
        type: 'input',
        name: 'queryFields',
        message: 'Query filter fields with types (format: field:type, e.g., status:string,priority:number):',
        filter: function(value) {
          return value.split(',').map(field => {
            const [name, type] = field.trim().split(':')
            return { name: name.trim(), type: type?.trim() || 'string' }
          })
        }
      },
      {
        type: 'input',
        name: 'relations',
        message: 'Relations to include (format: name:type, e.g., property:Property,unit:Unit[]):',
        filter: function(value) {
          if (!value) return []
          return value.split(',').map(rel => {
            const [name, type] = rel.trim().split(':')
            return { name: name.trim(), type: type?.trim() || 'any' }
          })
        }
      },
      {
        type: 'input',
        name: 'includeRelations',
        message: 'Relations to include in queries (format: name or name:select, e.g., property,unit:id,status):',
        filter: function(value) {
          if (!value) return []
          return value.split(',').map(rel => {
            const parts = rel.trim().split(':')
            const name = parts[0].trim()
            const selectFields = parts[1]
            
            if (selectFields) {
              return {
                name,
                select: selectFields.split(',').map(field => ({
                  name: field.trim(),
                  value: true
                }))
              }
            }
            return { name }
          })
        }
      },
      {
        type: 'input',
        name: 'countRelations',
        message: 'Relations to count (comma-separated, e.g., units,leases):',
        filter: function(value) {
          if (!value) return []
          return value.split(',').map(rel => ({ name: rel.trim() }))
        }
      }
    ],
    actions: function(data) {
      const actions = []
      const modulePath = `apps/backend/src/${plop.getHelper('kebabCase')(data.name)}`
      
      // Create directory structure
      actions.push({
        type: 'add',
        path: `${modulePath}/dto/index.ts`,
        template: `export * from './create-${plop.getHelper('kebabCase')(data.name)}.dto'\nexport * from './update-${plop.getHelper('kebabCase')(data.name)}.dto'\nexport * from './query-${plop.getHelper('kebabCase')(data.name)}.dto'\n`
      })
      
      // Generate all files
      const files = [
        'create-dto',
        'update-dto', 
        'query-dto',
        'controller',
        'service',
        'repository',
        'module',
        'exceptions'
      ]
      
      files.forEach(file => {
        const templatePath = `plop-templates/crud-module/${file}.hbs`
        let outputPath
        
        if (file.includes('-dto')) {
          outputPath = `${modulePath}/dto/${file.replace('-dto', '-')}${plop.getHelper('kebabCase')(data.name)}.dto.ts`
        } else if (file === 'exceptions') {
          outputPath = `apps/backend/src/common/exceptions/${plop.getHelper('kebabCase')(data.name)}.exceptions.ts`
        } else {
          outputPath = `${modulePath}/${plop.getHelper('kebabCase')(data.name)}.${file}.ts`
        }
        
        actions.push({
          type: 'add',
          path: outputPath,
          templateFile: templatePath,
          data: data
        })
      })
      
      // Add module to app.module.ts
      actions.push({
        type: 'modify',
        path: 'apps/backend/src/app.module.ts',
        pattern: /(import.*from.*['"][^'"]*['"][\s\S]*?)(\n\n@Module\({)/,
        template: `$1\nimport { {{pascalCase name}}Module } from './{{kebabCase name}}/{{kebabCase name}}.module'$2`
      })
      
      actions.push({
        type: 'modify', 
        path: 'apps/backend/src/app.module.ts',
        pattern: /(imports: \[[\s\S]*?)((\n\s*\])|(\],))/,
        template: `$1,\n    {{pascalCase name}}Module$2`
      })
      
      return actions
    }
  })

  // DTO Generator (standalone)
  plop.setGenerator('dto', {
    description: 'Generate DTOs for an existing module',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Module name (singular, PascalCase):',
        validate: function (value) {
          if (!value) return 'Module name is required'
          return true
        }
      },
      {
        type: 'input',
        name: 'fields',
        message: 'Fields with validation (format: name:type:validation, e.g., title:string:required,priority:number:min=1):',
        filter: function(value) {
          return value.split(',').map(field => {
            const [name, type, validation] = field.trim().split(':')
            return {
              name: name.trim(),
              type: type?.trim() || 'string',
              validation: validation?.trim() || 'required'
            }
          })
        }
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'apps/backend/src/{{kebabCase name}}/dto/create-{{kebabCase name}}.dto.ts',
        templateFile: 'plop-templates/crud-module/create-dto.hbs'
      },
      {
        type: 'add',
        path: 'apps/backend/src/{{kebabCase name}}/dto/update-{{kebabCase name}}.dto.ts',
        templateFile: 'plop-templates/crud-module/update-dto.hbs'
      },
      {
        type: 'add',
        path: 'apps/backend/src/{{kebabCase name}}/dto/query-{{kebabCase name}}.dto.ts',
        templateFile: 'plop-templates/crud-module/query-dto.hbs'
      }
    ]
  })

  // Exception Generator
  plop.setGenerator('exceptions', {
    description: 'Generate custom exceptions for a module',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Module name (singular, PascalCase):',
      },
      {
        type: 'confirm',
        name: 'hasStatus',
        message: 'Include status transition exceptions?',
        default: false
      },
      {
        type: 'confirm',
        name: 'hasFile',
        message: 'Include file operation exceptions?',
        default: false
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'apps/backend/src/common/exceptions/{{kebabCase name}}.exceptions.ts',
        templateFile: 'plop-templates/crud-module/exceptions.hbs'
      }
    ]
  })
}