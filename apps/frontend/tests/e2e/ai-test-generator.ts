/**
 * AI Test Generator
 * Use this with Claude Code to generate tests from natural language descriptions
 */

export interface TestScenario {
  name: string
  description: string
  steps: string[]
  assertions: string[]
}

export const testTemplates = {
  loginFlow: {
    name: 'Login Flow Test',
    description: 'Test user login functionality',
    steps: [
      'Navigate to login page',
      'Fill email field with {email}',
      'Fill password field with {password}',
      'Click submit button',
      'Wait for dashboard to load'
    ],
    assertions: [
      'Should show dashboard after login',
      'Should display welcome message',
      'Should show user navigation'
    ]
  },

  formValidation: {
    name: 'Form Validation Test',
    description: 'Test form validation behavior',
    steps: [
      'Navigate to {form} page',
      'Try to submit empty form',
      'Verify error messages appear',
      'Fill required fields',
      'Submit form successfully'
    ],
    assertions: [
      'Should show required field errors',
      'Should validate email format',
      'Should show success message on valid submit'
    ]
  },

  crudOperations: {
    name: 'CRUD Operations Test',
    description: 'Test create, read, update, delete operations',
    steps: [
      'Navigate to {entity} list page',
      'Click add {entity} button',
      'Fill {entity} form with test data',
      'Save {entity}',
      'Verify {entity} appears in list',
      'Edit {entity}',
      'Update {entity} data',
      'Save changes',
      'Verify changes are displayed',
      'Delete {entity}',
      'Confirm deletion'
    ],
    assertions: [
      'Should create new {entity}',
      'Should display {entity} in list',
      'Should update {entity} successfully',
      'Should delete {entity} successfully'
    ]
  },

  navigation: {
    name: 'Navigation Test',
    description: 'Test application navigation',
    steps: [
      'Start on home page',
      'Navigate to {section1}',
      'Verify {section1} content loads',
      'Navigate to {section2}',
      'Verify {section2} content loads',
      'Use breadcrumbs to go back',
      'Test mobile navigation menu'
    ],
    assertions: [
      'Should navigate between sections',
      'Should show correct page content',
      'Should maintain navigation state',
      'Should work on mobile'
    ]
  },

  searchAndFilter: {
    name: 'Search and Filter Test',
    description: 'Test search and filtering functionality',
    steps: [
      'Navigate to {searchable} page',
      'Enter search term: {searchTerm}',
      'Verify search results appear',
      'Apply filter: {filterType}',
      'Verify filtered results',
      'Clear search and filters',
      'Verify all items return'
    ],
    assertions: [
      'Should return relevant search results',
      'Should filter correctly',
      'Should clear filters properly',
      'Should handle no results gracefully'
    ]
  },

  responsiveDesign: {
    name: 'Responsive Design Test',
    description: 'Test responsive behavior across devices',
    steps: [
      'Load page in desktop view (1280px)',
      'Verify desktop layout',
      'Resize to tablet view (768px)',
      'Verify tablet layout adaptations',
      'Resize to mobile view (375px)',
      'Verify mobile layout',
      'Test mobile navigation',
      'Test touch interactions'
    ],
    assertions: [
      'Should adapt layout for different screen sizes',
      'Should show mobile menu on small screens',
      'Should maintain functionality across devices',
      'Should be touch-friendly on mobile'
    ]
  },

  errorHandling: {
    name: 'Error Handling Test',
    description: 'Test error scenarios and recovery',
    steps: [
      'Trigger network error scenario',
      'Verify error message appears',
      'Test retry functionality',
      'Test invalid input handling',
      'Test permission denied scenarios',
      'Test recovery actions'
    ],
    assertions: [
      'Should show appropriate error messages',
      'Should provide retry options',
      'Should handle edge cases gracefully',
      'Should maintain app stability'
    ]
  }
}

/**
 * Generate test code from natural language description
 */
export function generateTestCode(scenario: TestScenario): string {
  return `
test('${scenario.name}', async ({ page, ai }) => {
  // ${scenario.description}

  ${scenario.steps.map((step, index) => `
  // Step ${index + 1}: ${step}
  // Future enhancement: convert to ai.action("${step}") for richer telemetry
  `).join('')}

  ${scenario.assertions.map((assertion, index) => `
  // Assertion ${index + 1}: ${assertion}
  // Future enhancement: convert to ai.expectVisible("${assertion}") once helpers stabilize
  `).join('')}
})
`
}

/**
 * Common test patterns for TenantFlow
 */
export const tenantFlowPatterns = {
  propertyManagement: {
    create: 'Create a new property with name "Test Property", address "123 Test St", and 10 units',
    edit: 'Edit the property to change the address to "456 New St"',
    delete: 'Delete the test property and confirm deletion',
    list: 'View all properties and verify they are displayed correctly'
  },

  tenantManagement: {
    create: 'Add a new tenant named "John Doe" with email "john@example.com"',
    assign: 'Assign the tenant to unit 101 in Test Property',
    moveOut: 'Process move-out for the tenant',
    viewProfile: 'View tenant profile and contact information'
  },

  maintenance: {
    createRequest: 'Create a maintenance request for "Leaky faucet" in unit 101',
    assignTechnician: 'Assign the request to technician "Mike Smith"',
    updateStatus: 'Update request status to "In Progress"',
    completeRequest: 'Mark the request as completed with notes'
  },

  dashboard: {
    viewStats: 'Check dashboard shows correct property and tenant counts',
    viewCharts: 'Verify revenue and occupancy charts display data',
    viewAlerts: 'Check for any alerts or notifications',
    exportData: 'Export dashboard data to PDF'
  },

  billing: {
    generateInvoice: 'Generate rent invoice for tenant in unit 101',
    recordPayment: 'Record rent payment of $1200 for unit 101',
    viewHistory: 'View payment history for the tenant',
    sendReminder: 'Send payment reminder to tenant'
  }
}

/**
 * Usage examples for Claude Code:
 *
 * 1. "Generate a test for creating a new property"
 * 2. "Create a test that validates the login form"
 * 3. "Write a test for responsive design on the dashboard"
 * 4. "Generate a test for the tenant management workflow"
 * 5. "Create a test that checks error handling when the server is down"
 */
