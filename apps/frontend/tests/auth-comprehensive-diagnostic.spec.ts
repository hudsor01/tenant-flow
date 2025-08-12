/**
 * COMPREHENSIVE AUTHENTICATION DIAGNOSTIC TEST
 * 
 * This test suite performs deep inspection of the entire auth system
 * to identify exactly WHERE authentication is failing.
 * 
 * Test Coverage:
 * 1. Environment configuration validation
 * 2. Supabase client initialization
 * 3. Network request monitoring
 * 4. Signup flow with error capture
 * 5. Login flow testing
 * 6. API backend integration
 * 7. Console error monitoring
 * 8. Session persistence testing
 */

import { test, expect, type Page } from '@playwright/test';

interface AuthTestResult {
  success: boolean;
  error?: string;
  details?: any;
}

interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  error?: string;
}

interface ConsoleMessage {
  type: 'log' | 'error' | 'warn' | 'info';
  text: string;
  location: string;
  timestamp: Date;
}

class AuthDiagnostics {
  private page: Page;
  private networkRequests: NetworkRequest[] = [];
  private consoleMessages: ConsoleMessage[] = [];
  private errors: string[] = [];

  constructor(page: Page) {
    this.page = page;
    this.setupNetworkMonitoring();
    this.setupConsoleMonitoring();
    this.setupErrorMonitoring();
  }

  private setupNetworkMonitoring() {
    // Monitor all network requests
    this.page.on('request', async (request) => {
      const url = request.url();
      // Only track relevant requests
      if (url.includes('supabase') || url.includes('api.tenantflow') || url.includes('auth')) {
        console.log(`🌐 REQUEST: ${request.method()} ${url}`);
      }
    });

    this.page.on('response', async (response) => {
      const request = response.request();
      const url = request.url();
      
      // Only track relevant responses
      if (url.includes('supabase') || url.includes('api.tenantflow') || url.includes('auth')) {
        try {
          const requestBody = request.postDataJSON();
          let responseBody;
          
          try {
            responseBody = await response.json();
          } catch {
            try {
              responseBody = await response.text();
            } catch {
              responseBody = 'Could not parse response body';
            }
          }

          const networkRequest: NetworkRequest = {
            url: url,
            method: request.method(),
            status: response.status(),
            statusText: response.statusText(),
            headers: await response.allHeaders(),
            requestBody,
            responseBody
          };

          this.networkRequests.push(networkRequest);
          
          console.log(`📡 RESPONSE: ${response.status()} ${request.method()} ${url}`);
          if (response.status() >= 400) {
            console.log(`❌ ERROR RESPONSE:`, responseBody);
          }
        } catch (error) {
          this.networkRequests.push({
            url,
            method: request.method(),
            status: response.status(),
            statusText: response.statusText(),
            headers: {},
            error: `Failed to parse response: ${error}`
          });
        }
      }
    });

    // Monitor failed requests
    this.page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('supabase') || url.includes('api.tenantflow') || url.includes('auth')) {
        const error = `Request failed: ${request.method()} ${url} - ${request.failure()?.errorText}`;
        this.errors.push(error);
        console.log(`💥 REQUEST FAILED: ${error}`);
      }
    });
  }

  private setupConsoleMonitoring() {
    this.page.on('console', (msg) => {
      const consoleMessage: ConsoleMessage = {
        type: msg.type() as any,
        text: msg.text(),
        location: msg.location().url || 'unknown',
        timestamp: new Date()
      };
      
      this.consoleMessages.push(consoleMessage);
      
      // Log important messages immediately
      if (msg.type() === 'error' || msg.text().includes('error') || msg.text().includes('Error')) {
        console.log(`🚨 CONSOLE ERROR: ${msg.text()}`);
        this.errors.push(`Console Error: ${msg.text()}`);
      } else if (msg.text().includes('auth') || msg.text().includes('supabase')) {
        console.log(`📝 CONSOLE: ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });
  }

  private setupErrorMonitoring() {
    this.page.on('pageerror', (error) => {
      const errorMessage = `Page Error: ${error.name}: ${error.message}`;
      this.errors.push(errorMessage);
      console.log(`💥 PAGE ERROR: ${errorMessage}`);
    });
  }

  getNetworkRequests(): NetworkRequest[] {
    return [...this.networkRequests];
  }

  getConsoleMessages(): ConsoleMessage[] {
    return [...this.consoleMessages];
  }

  getErrors(): string[] {
    return [...this.errors];
  }

  clearLogs() {
    this.networkRequests = [];
    this.consoleMessages = [];
    this.errors = [];
  }

  generateReport(): string {
    const report = [
      '='.repeat(80),
      'AUTHENTICATION DIAGNOSTIC REPORT',
      '='.repeat(80),
      '',
      `Generated: ${new Date().toISOString()}`,
      `Total Network Requests: ${this.networkRequests.length}`,
      `Total Console Messages: ${this.consoleMessages.length}`,
      `Total Errors: ${this.errors.length}`,
      '',
      '--- ERRORS ---',
      ...this.errors.map(error => `❌ ${error}`),
      '',
      '--- NETWORK REQUESTS ---',
      ...this.networkRequests.map(req => 
        `📡 ${req.method} ${req.url} → ${req.status} ${req.statusText}${req.error ? ` (${req.error})` : ''}`
      ),
      '',
      '--- CONSOLE MESSAGES ---',
      ...this.consoleMessages
        .filter(msg => msg.type === 'error' || msg.text.includes('auth') || msg.text.includes('supabase'))
        .map(msg => `📝 [${msg.type.toUpperCase()}] ${msg.text}`),
      '',
      '='.repeat(80)
    ];
    
    return report.join('\n');
  }
}

test.describe('Comprehensive Authentication Diagnostics', () => {
  let diagnostics: AuthDiagnostics;

  test.beforeEach(async ({ page }) => {
    diagnostics = new AuthDiagnostics(page);
  });

  test('1. Environment Configuration Validation', async ({ page }) => {
    console.log('🔍 STEP 1: Testing Environment Configuration');
    
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Check if required environment variables are accessible
    const envCheck = await page.evaluate(() => {
      return {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'NOT_SET',
        stripeKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'SET' : 'NOT_SET'
      };
    });
    
    console.log('📊 Environment Variables:', envCheck);
    
    // Check if Supabase client is initialized
    const supabaseCheck = await page.evaluate(() => {
      try {
        // @ts-ignore - accessing global for testing
        const client = window.__supabaseClient;
        return {
          clientExists: !!client,
          clientType: typeof client,
          hasAuth: !!(client?.auth),
          authType: typeof client?.auth
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('🔧 Supabase Client Check:', supabaseCheck);
    
    expect(envCheck.supabaseUrl).not.toBe('NOT_SET');
    expect(envCheck.supabaseAnonKey).toBe('SET');
  });

  test('2. Supabase Client Initialization Deep Test', async ({ page }) => {
    console.log('🔍 STEP 2: Testing Supabase Client Initialization');
    
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Test Supabase client methods
    const clientTest = await page.evaluate(async () => {
      try {
        // Import Supabase client
        const { supabase } = await import('/src/lib/supabase');
        
        console.log('✅ Supabase module imported successfully');
        
        // Test basic client functionality
        const tests = {
          clientExists: !!supabase,
          authExists: !!supabase?.auth,
          canGetSession: false,
          canGetUser: false,
          sessionData: null,
          userData: null,
          errors: []
        };
        
        // Test getSession
        try {
          const { data, error } = await supabase.auth.getSession();
          tests.canGetSession = true;
          tests.sessionData = { hasSession: !!data.session, error: error?.message };
          console.log('✅ getSession works:', tests.sessionData);
        } catch (error) {
          tests.errors.push(`getSession failed: ${error.message}`);
          console.log('❌ getSession failed:', error.message);
        }
        
        // Test getUser
        try {
          const { data, error } = await supabase.auth.getUser();
          tests.canGetUser = true;
          tests.userData = { hasUser: !!data.user, error: error?.message };
          console.log('✅ getUser works:', tests.userData);
        } catch (error) {
          tests.errors.push(`getUser failed: ${error.message}`);
          console.log('❌ getUser failed:', error.message);
        }
        
        return tests;
      } catch (error) {
        return { error: `Client test failed: ${error.message}` };
      }
    });
    
    console.log('🔧 Supabase Client Test Results:', clientTest);
    
    if (clientTest.error) {
      console.log('❌ Client initialization failed:', clientTest.error);
    }
    
    expect(clientTest.clientExists).toBe(true);
    expect(clientTest.authExists).toBe(true);
  });

  test('3. Signup Flow Comprehensive Test', async ({ page }) => {
    console.log('🔍 STEP 3: Testing Signup Flow');
    
    diagnostics.clearLogs();
    
    // Generate unique test user
    const testUser = {
      fullName: 'Test User Diagnostic',
      email: `test.diagnostic.${Date.now()}@example.com`,
      password: 'TestPassword123!',
      companyName: 'Test Company'
    };
    
    console.log('👤 Test User:', { ...testUser, password: '***' });
    
    // Navigate to signup
    await page.goto('http://localhost:3001/auth/signup');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Current URL:', page.url());
    
    // Check if signup form is present
    const formExists = await page.locator('form').count();
    console.log(`📋 Signup form present: ${formExists > 0 ? '✅' : '❌'} (${formExists} forms found)`);
    
    if (formExists === 0) {
      console.log('❌ No signup form found, capturing page content...');
      const pageContent = await page.locator('body').innerHTML();
      console.log('📄 Page HTML:', pageContent.substring(0, 500) + '...');
    }
    
    // Fill out the form
    try {
      console.log('📝 Filling signup form...');
      
      // Fill name field
      const nameInput = page.locator('input[name="fullName"]');
      await nameInput.fill(testUser.fullName);
      console.log('✅ Filled name field');
      
      // Fill email field
      const emailInput = page.locator('input[name="email"]');
      await emailInput.fill(testUser.email);
      console.log('✅ Filled email field');
      
      // Fill password field
      const passwordInput = page.locator('input[name="password"]');
      await passwordInput.fill(testUser.password);
      console.log('✅ Filled password field');
      
      // Fill confirm password field
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
      await confirmPasswordInput.fill(testUser.password);
      console.log('✅ Filled confirm password field');
      
      // Accept terms
      const termsCheckbox = page.locator('input[name="terms"], #terms');
      await termsCheckbox.check();
      console.log('✅ Accepted terms');
      
      // Wait for form validation
      await page.waitForTimeout(2000);
      
      // Check submit button state
      const submitButton = page.locator('button[type="submit"]');
      const isDisabled = await submitButton.isDisabled();
      console.log(`🔘 Submit button disabled: ${isDisabled ? '❌' : '✅'}`);
      
      // Submit the form
      console.log('🚀 Submitting form...');
      await submitButton.click({ force: true });
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      // Check for success or error messages
      const pageText = await page.locator('body').innerText();
      
      if (pageText.includes('check your email') || pageText.includes('verification')) {
        console.log('✅ Signup appears successful - email verification message found');
      } else if (pageText.includes('error') || pageText.includes('Error')) {
        const errorMatch = pageText.match(/.*error.*/gi);
        console.log('❌ Error message found:', errorMatch?.[0]);
      } else {
        console.log('⚠️  Unclear result, current page:', page.url());
        console.log('📄 Page content preview:', pageText.substring(0, 300));
      }
      
    } catch (error) {
      console.log('❌ Form submission failed:', error.message);
    }
    
    // Generate network and error report
    const networkRequests = diagnostics.getNetworkRequests();
    const errors = diagnostics.getErrors();
    
    console.log(`📊 Network requests made: ${networkRequests.length}`);
    console.log(`📊 Errors captured: ${errors.length}`);
    
    networkRequests.forEach(req => {
      console.log(`📡 ${req.method} ${req.url} → ${req.status}`);
      if (req.status >= 400) {
        console.log(`   ❌ Error response:`, req.responseBody);
      }
    });
    
    errors.forEach(error => {
      console.log(`❌ ${error}`);
    });
  });

  test('4. Login Flow Test', async ({ page }) => {
    console.log('🔍 STEP 4: Testing Login Flow');
    
    diagnostics.clearLogs();
    
    await page.goto('http://localhost:3001/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Check if login form exists
    const formExists = await page.locator('form').count();
    console.log(`📋 Login form present: ${formExists > 0 ? '✅' : '❌'}`);
    
    // Try to login with test credentials
    const testCredentials = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };
    
    try {
      await page.fill('input[name="email"]', testCredentials.email);
      await page.fill('input[name="password"]', testCredentials.password);
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      console.log('📍 After login attempt, URL:', currentUrl);
      
    } catch (error) {
      console.log('❌ Login test failed:', error.message);
    }
    
    const loginRequests = diagnostics.getNetworkRequests();
    console.log(`📊 Login requests: ${loginRequests.length}`);
    loginRequests.forEach(req => {
      console.log(`📡 ${req.method} ${req.url} → ${req.status}`);
    });
  });

  test('5. API Backend Integration Test', async ({ page }) => {
    console.log('🔍 STEP 5: Testing API Backend Integration');
    
    // Test API endpoints directly
    const apiTests = [
      { name: 'Health Check', url: 'https://api.tenantflow.app/health' },
      { name: 'Auth Me (should be 401)', url: 'https://api.tenantflow.app/api/v1/auth/me' },
      { name: 'API Root', url: 'https://api.tenantflow.app/api/v1' }
    ];
    
    for (const test of apiTests) {
      try {
        console.log(`🧪 Testing ${test.name}: ${test.url}`);
        const response = await page.request.get(test.url);
        console.log(`✅ ${test.name}: ${response.status()} ${response.statusText()}`);
        
        if (response.status() < 500) {
          try {
            const body = await response.json();
            console.log(`   📄 Response:`, body);
          } catch {
            const text = await response.text();
            console.log(`   📄 Response:`, text.substring(0, 200));
          }
        }
      } catch (error) {
        console.log(`❌ ${test.name} failed:`, error.message);
      }
    }
  });

  test('6. Session Persistence Test', async ({ page }) => {
    console.log('🔍 STEP 6: Testing Session Persistence');
    
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Check localStorage for auth tokens
    const storageData = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('supabase') || key.includes('tf-'))) {
          storage[key] = localStorage.getItem(key);
        }
      }
      return storage;
    });
    
    console.log('💾 Auth-related localStorage:', storageData);
    
    // Check sessionStorage
    const sessionData = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('auth') || key.includes('supabase') || key.includes('tf-'))) {
          storage[key] = sessionStorage.getItem(key);
        }
      }
      return storage;
    });
    
    console.log('💾 Auth-related sessionStorage:', sessionData);
  });

  test.afterEach(async () => {
    // Generate final diagnostic report
    const report = diagnostics.generateReport();
    console.log('\n' + report);
  });
});