import { test, expect } from '@playwright/test';
import { VisualDebugger, TestDocumentation, TestScenario } from '../../test-utils/diagnostic-e2e';

// Document the complete auth flow scenario
const authFlowScenario: TestScenario = {
  name: 'Complete Authentication Flow',
  description: 'Tests the full authentication journey from login to dashboard access',
  setup: [
    'TenantFlow application is running on localhost',
    'Test user exists in Supabase: test@tenantflow.dev',
    'User has PROPERTY_MANAGER role',
    'User belongs to active organization',
  ],
  steps: [
    {
      action: 'Navigate to login page',
      validation: 'Login form is visible and interactive',
    },
    {
      action: 'Enter credentials and submit',
      data: { email: 'test@tenantflow.dev', password: 'test123456' },
      validation: 'Form submission triggers authentication',
    },
    {
      action: 'Wait for Supabase auth processing',
      validation: 'Loading states are shown appropriately',
    },
    {
      action: 'Handle auth success response',
      validation: 'JWT token is stored in localStorage',
    },
    {
      action: 'Redirect to dashboard',
      validation: 'User lands on authenticated dashboard',
    },
    {
      action: 'Verify authenticated state',
      validation: 'User menu and protected content visible',
    },
  ],
  expectedOutcome: 'User successfully authenticated and viewing dashboard',
  commonFailures: [
    {
      symptom: 'Login form submit button is disabled',
      causes: [
        'Form validation preventing submission',
        'Missing or invalid email format',
        'Password doesn\'t meet requirements',
        'Network request in progress',
      ],
      fixes: [
        'Check browser console for validation errors',
        'Verify email format matches RFC 5322',
        'Ensure password meets minimum requirements',
        'Wait for any pending requests to complete',
      ],
    },
    {
      symptom: 'Authentication succeeds but no redirect occurs',
      causes: [
        'React Router navigation blocked',
        'Auth state not properly updated',
        'Protected route guard failing',
        'Local storage not accessible',
      ],
      fixes: [
        'Check React Router configuration',
        'Verify auth context provider setup',
        'Inspect localStorage for auth tokens',
        'Check browser security settings',
      ],
    },
  ],
};

test.describe('Authentication Flow - Enhanced Diagnostics', () => {
  let visualDebugger: VisualDebugger;

  test.beforeEach(async ({ page, context }) => {
    visualDebugger = new VisualDebugger(page, context);
    
    console.log(TestDocumentation.describeScenario(authFlowScenario));
    
    // Setup network monitoring
    await visualDebugger.startNetworkMonitoring();
    
    // Setup console log capture
    await visualDebugger.startConsoleCapture();
    
    // Navigate to app
    await page.goto('http://localhost:3000');
  });

  test.afterEach(async ({ page }) => {
    // Generate debug report for failed tests
    if (test.info().status === 'failed') {
      await visualDebugger.generateFailureReport(test.info().title);
    }
  });

  test('should provide detailed feedback on login form issues', async ({ page }) => {
    await test.step('Navigate to login page', async () => {
      // Wait for login form to be visible
      const loginForm = page.locator('[data-testid="login-form"]');
      await expect(loginForm).toBeVisible({ timeout: 10000 });
      
      // Capture initial page state
      await visualDebugger.capturePageState('login-page-loaded');
    });

    await test.step('Analyze form validation with invalid inputs', async () => {
      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');
      const submitButton = page.locator('[data-testid="login-submit"]');

      // Test with invalid email
      await emailInput.fill('invalid-email');
      await passwordInput.fill('short');
      
      // Check if submit button is properly disabled
      const isDisabled = await submitButton.isDisabled();
      
      if (isDisabled) {
        console.log('\n✅ Form Validation Working:');
        console.log('Submit button correctly disabled for invalid inputs');
        
        // Show validation messages
        const validationMessages = await page.locator('[data-testid*="error"]').allTextContents();
        if (validationMessages.length > 0) {
          console.log('Validation messages displayed:');
          validationMessages.forEach((msg, i) => console.log(`  ${i + 1}. ${msg}`));
        }
      } else {
        console.log('\n❌ Form Validation Issue:');
        console.log('Submit button should be disabled for invalid inputs');
        
        // Capture debug info
        await visualDebugger.captureElementStates('form-validation-failure', [
          '[data-testid="email-input"]',
          '[data-testid="password-input"]',
          '[data-testid="login-submit"]',
        ]);
        
        console.log('\n💡 Check these issues:');
        console.log('1. Email validation regex is working');
        console.log('2. Password length validation is active');
        console.log('3. Form state management is updating correctly');
        console.log('4. Submit button disabled state is bound to form validity');
      }
    });

    await test.step('Test successful login flow with debugging', async () => {
      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');
      const submitButton = page.locator('[data-testid="login-submit"]');

      // Clear and enter valid credentials
      await emailInput.clear();
      await emailInput.fill('test@tenantflow.dev');
      await passwordInput.clear();
      await passwordInput.fill('test123456');

      // Capture state before submission
      await visualDebugger.capturePageState('before-login-submit');

      // Monitor network requests during login
      const authRequestPromise = page.waitForRequest(request => 
        request.url().includes('/auth/') && request.method() === 'POST'
      );

      await submitButton.click();

      try {
        // Wait for auth request
        const authRequest = await authRequestPromise;
        console.log('\n🌐 Auth Request Details:');
        console.log(`URL: ${authRequest.url()}`);
        console.log(`Method: ${authRequest.method()}`);
        
        // Wait for response
        const response = await authRequest.response();
        if (response) {
          console.log(`Status: ${response.status()}`);
          
          if (response.status() !== 200) {
            // Capture failure details
            console.log('❌ Auth request failed');
            const responseBody = await response.text();
            console.log('Response:', responseBody);
            
            await visualDebugger.capturePageState('auth-request-failed');
          }
        }
      } catch (error) {
        console.log('❌ Auth request timeout or error:', error.message);
        
        // Capture current page state for debugging
        await visualDebugger.capturePageState('auth-timeout');
        
        // Check for error messages on page
        const errorMessages = await page.locator('[data-testid*="error"], .error-message, [role="alert"]').allTextContents();
        if (errorMessages.length > 0) {
          console.log('Error messages found:');
          errorMessages.forEach(msg => console.log(`  - ${msg}`));
        }
      }
    });

    await test.step('Verify post-login state', async () => {
      // Wait for potential redirect
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      console.log(`\n📍 Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ Successfully redirected to dashboard');
        
        // Verify auth tokens are stored
        const authToken = await page.evaluate(() => localStorage.getItem('auth-token'));
        const supabaseSession = await page.evaluate(() => localStorage.getItem('supabase.auth.token'));
        
        console.log('\n🔑 Auth Storage:');
        console.log(`Auth Token: ${authToken ? 'Present' : 'Missing'}`);
        console.log(`Supabase Session: ${supabaseSession ? 'Present' : 'Missing'}`);
        
        if (!authToken || !supabaseSession) {
          console.log('⚠️  Missing auth data - this may cause issues');
          await visualDebugger.capturePageState('missing-auth-tokens');
        }
        
        // Check for user menu visibility
        const userMenu = page.locator('[data-testid="user-menu"]');
        const isUserMenuVisible = await userMenu.isVisible().catch(() => false);
        
        if (isUserMenuVisible) {
          console.log('✅ User menu visible - auth state confirmed');
        } else {
          console.log('❌ User menu not visible - auth state may not be set');
          await visualDebugger.captureElementStates('missing-user-menu', [
            '[data-testid="user-menu"]',
            '[data-testid="login-form"]',
            '.auth-loading',
          ]);
        }
      } else {
        console.log('❌ Still on login page - authentication failed');
        
        // Capture comprehensive failure state
        await visualDebugger.capturePageState('login-failed');
        
        // Generate debugging script
        const debugScript = visualDebugger.generateDebuggingScript('login-failure', 'post-submit');
        console.log('\n🔧 Run this in browser console to debug:');
        console.log(debugScript);
      }
    });
  });

  test('should debug session persistence across page reloads', async ({ page }) => {
    // First, complete a successful login
    await page.goto('http://localhost:3000/login');
    
    await page.locator('[data-testid="email-input"]').fill('test@tenantflow.dev');
    await page.locator('[data-testid="password-input"]').fill('test123456');
    await page.locator('[data-testid="login-submit"]').click();
    
    // Wait for auth to complete
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    
    // Capture auth state before reload
    const beforeReload = await page.evaluate(() => ({
      authToken: localStorage.getItem('auth-token'),
      supabaseSession: localStorage.getItem('supabase.auth.token'),
      cookies: document.cookie,
      currentUrl: window.location.href,
    }));
    
    console.log('\n🔄 Session Persistence Test:');
    console.log('Before reload:', JSON.stringify(beforeReload, null, 2));
    
    // Reload the page
    await page.reload();
    
    // Wait for app to initialize
    await page.waitForTimeout(3000);
    
    // Capture auth state after reload
    const afterReload = await page.evaluate(() => ({
      authToken: localStorage.getItem('auth-token'),
      supabaseSession: localStorage.getItem('supabase.auth.token'),
      cookies: document.cookie,
      currentUrl: window.location.href,
    }));
    
    console.log('After reload:', JSON.stringify(afterReload, null, 2));
    
    // Compare states
    const sessionPersisted = beforeReload.authToken === afterReload.authToken &&
                             beforeReload.supabaseSession === afterReload.supabaseSession;
    
    if (sessionPersisted) {
      console.log('✅ Session data persisted correctly');
      
      // Verify user remains on protected route
      if (afterReload.currentUrl.includes('/dashboard')) {
        console.log('✅ User remains on protected route after reload');
      } else {
        console.log('❌ User redirected away from protected route');
        console.log('💡 Check auth guard implementation');
      }
    } else {
      console.log('❌ Session data was lost during reload');
      console.log('💡 Possible issues:');
      console.log('  - localStorage being cleared');
      console.log('  - Supabase session not properly restored');
      console.log('  - Auth provider not initializing correctly');
      
      await visualDebugger.capturePageState('session-persistence-failure');
    }
  });

  test('should handle authentication errors with clear feedback', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // Test with invalid credentials
    await page.locator('[data-testid="email-input"]').fill('invalid@example.com');
    await page.locator('[data-testid="password-input"]').fill('wrongpassword');
    
    // Monitor for auth errors
    let errorCaught = false;
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('auth')) {
        errorCaught = true;
        console.log('🔍 Auth Error in Console:', msg.text());
      }
    });
    
    await page.locator('[data-testid="login-submit"]').click();
    
    // Wait for error to potentially appear
    await page.waitForTimeout(3000);
    
    // Check for error display
    const errorElements = await page.locator('[data-testid*="error"], .error-message, [role="alert"]').all();
    
    if (errorElements.length > 0) {
      console.log('\n✅ Error Handling Working:');
      for (const element of errorElements) {
        const text = await element.textContent();
        console.log(`  Error message: "${text}"`);
      }
    } else {
      console.log('\n❌ No error feedback shown to user');
      console.log('💡 Issues to check:');
      console.log('  - Error handling in auth service');
      console.log('  - Error state management in components');
      console.log('  - Error display components');
      
      if (errorCaught) {
        console.log('  - Errors are logged but not displayed to user');
      }
      
      await visualDebugger.capturePageState('missing-error-feedback');
    }
    
    // Verify user is still on login page
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('✅ User correctly remains on login page after failed auth');
    } else {
      console.log('❌ User incorrectly redirected despite auth failure');
    }
  });

  test('should analyze loading states during authentication', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await page.locator('[data-testid="email-input"]').fill('test@tenantflow.dev');
    await page.locator('[data-testid="password-input"]').fill('test123456');
    
    console.log('\n⏳ Loading States Analysis:');
    
    // Monitor loading indicators
    const loadingIndicators = [
      '[data-testid="login-loading"]',
      '.loading-spinner',
      '[data-testid="login-submit"][disabled]',
    ];
    
    // Capture state before submission
    console.log('Before submit:');
    for (const selector of loadingIndicators) {
      const visible = await page.locator(selector).isVisible().catch(() => false);
      console.log(`  ${selector}: ${visible ? 'visible' : 'hidden'}`);
    }
    
    // Click submit and immediately check loading states
    await page.locator('[data-testid="login-submit"]').click();
    
    // Check loading states immediately after click
    console.log('\nImmediately after submit:');
    for (const selector of loadingIndicators) {
      const visible = await page.locator(selector).isVisible().catch(() => false);
      console.log(`  ${selector}: ${visible ? 'visible' : 'hidden'}`);
    }
    
    // Wait a moment and check again
    await page.waitForTimeout(1000);
    console.log('\n1 second after submit:');
    for (const selector of loadingIndicators) {
      const visible = await page.locator(selector).isVisible().catch(() => false);
      console.log(`  ${selector}: ${visible ? 'visible' : 'hidden'}`);
    }
    
    // Check if any loading indicators are present
    const hasLoadingIndicators = await Promise.all(
      loadingIndicators.map(selector => 
        page.locator(selector).isVisible().catch(() => false)
      )
    );
    
    const someLoadingVisible = hasLoadingIndicators.some(Boolean);
    
    if (!someLoadingVisible) {
      console.log('\n⚠️  No loading indicators found');
      console.log('💡 Consider adding:');
      console.log('  - Disabled state for submit button during request');
      console.log('  - Loading spinner or text');
      console.log('  - Loading skeleton for better UX');
      
      console.log('\n📝 Example implementation:');
      console.log(`
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async (data) => {
  setIsLoading(true);
  try {
    await authService.login(data);
  } finally {
    setIsLoading(false);
  }
};

<button 
  disabled={isLoading}
  data-testid="login-submit"
>
  {isLoading ? 'Signing in...' : 'Sign In'}
</button>
      `.trim());
    } else {
      console.log('\n✅ Loading indicators working properly');
    }
  });
});