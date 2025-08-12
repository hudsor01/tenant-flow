/**
 * Client-side Authentication Diagnostic Tool
 * 
 * This module provides comprehensive auth system testing directly in the browser.
 * Can be run from the console or embedded in pages for real-time diagnostics.
 */

interface DiagnosticResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

interface AuthDiagnosticReport {
  timestamp: string;
  environment: {
    supabaseUrl: string;
    hasAnonKey: boolean;
    apiUrl: string;
    hasStripeKey: boolean;
  };
  supabaseClient: {
    initialized: boolean;
    hasAuth: boolean;
    canGetSession: boolean;
    canGetUser: boolean;
    sessionResult?: any;
    userResult?: any;
    errors: string[];
  };
  authActions: {
    canImportActions: boolean;
    signupActionExists: boolean;
    loginActionExists: boolean;
    errors: string[];
  };
  networkConnectivity: {
    canReachApi: boolean;
    apiHealthStatus?: number;
    apiHealthResponse?: any;
    canReachSupabase: boolean;
    supabaseStatus?: number;
    errors: string[];
  };
  formElements: {
    signupFormExists: boolean;
    loginFormExists: boolean;
    requiredFieldsPresent: boolean;
    formFieldDetails?: any;
  };
  summary: {
    overallStatus: 'healthy' | 'degraded' | 'broken';
    criticalIssues: string[];
    warnings: string[];
    recommendations: string[];
  };
}

class AuthDiagnosticTool {
  private report: AuthDiagnosticReport;
  
  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: '',
        hasAnonKey: false,
        apiUrl: '',
        hasStripeKey: false
      },
      supabaseClient: {
        initialized: false,
        hasAuth: false,
        canGetSession: false,
        canGetUser: false,
        errors: []
      },
      authActions: {
        canImportActions: false,
        signupActionExists: false,
        loginActionExists: false,
        errors: []
      },
      networkConnectivity: {
        canReachApi: false,
        canReachSupabase: false,
        errors: []
      },
      formElements: {
        signupFormExists: false,
        loginFormExists: false,
        requiredFieldsPresent: false
      },
      summary: {
        overallStatus: 'broken',
        criticalIssues: [],
        warnings: [],
        recommendations: []
      }
    };
  }

  async runFullDiagnostic(): Promise<AuthDiagnosticReport> {
    console.log('🔍 Starting comprehensive auth diagnostic...');
    
    await this.checkEnvironment();
    await this.checkSupabaseClient();
    await this.checkAuthActions();
    await this.checkNetworkConnectivity();
    await this.checkFormElements();
    this.generateSummary();
    
    return this.report;
  }

  private async checkEnvironment(): Promise<void> {
    console.log('📊 Checking environment configuration...');
    
    try {
      // Check environment variables
      this.report.environment.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      this.report.environment.hasAnonKey = !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      this.report.environment.apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      this.report.environment.hasStripeKey = !!(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      
      if (!this.report.environment.supabaseUrl) {
        this.report.summary.criticalIssues.push('NEXT_PUBLIC_SUPABASE_URL not set');
      }
      
      if (!this.report.environment.hasAnonKey) {
        this.report.summary.criticalIssues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY not set');
      }
      
      if (!this.report.environment.apiUrl) {
        this.report.summary.warnings.push('NEXT_PUBLIC_API_URL not set');
      }
      
      console.log('✅ Environment check completed');
    } catch (error) {
      console.log('❌ Environment check failed:', error);
      this.report.summary.criticalIssues.push(`Environment check failed: ${error.message}`);
    }
  }

  private async checkSupabaseClient(): Promise<void> {
    console.log('🔧 Checking Supabase client...');
    
    try {
      // Try to import Supabase client
      const { supabase, auth, getSession, getUser } = await import('./supabase');
      
      this.report.supabaseClient.initialized = !!supabase;
      this.report.supabaseClient.hasAuth = !!auth;
      
      if (supabase && auth) {
        console.log('✅ Supabase client imported successfully');
        
        // Test getSession
        try {
          const sessionResult = await getSession();
          this.report.supabaseClient.canGetSession = true;
          this.report.supabaseClient.sessionResult = {
            hasSession: !!sessionResult.session,
            error: sessionResult.error?.message
          };
          console.log('✅ getSession works');
        } catch (error) {
          this.report.supabaseClient.errors.push(`getSession failed: ${error.message}`);
          console.log('❌ getSession failed:', error.message);
        }
        
        // Test getUser
        try {
          const userResult = await getUser();
          this.report.supabaseClient.canGetUser = true;
          this.report.supabaseClient.userResult = {
            hasUser: !!userResult.user,
            error: userResult.error?.message
          };
          console.log('✅ getUser works');
        } catch (error) {
          this.report.supabaseClient.errors.push(`getUser failed: ${error.message}`);
          console.log('❌ getUser failed:', error.message);
        }
        
        // Test direct auth calls
        try {
          const { data, error } = await auth.getSession();
          console.log('✅ Direct auth.getSession works');
        } catch (error) {
          this.report.supabaseClient.errors.push(`Direct auth.getSession failed: ${error.message}`);
          console.log('❌ Direct auth.getSession failed:', error.message);
        }
        
      } else {
        this.report.summary.criticalIssues.push('Supabase client not properly initialized');
      }
      
    } catch (error) {
      console.log('❌ Supabase client import failed:', error);
      this.report.supabaseClient.errors.push(`Import failed: ${error.message}`);
      this.report.summary.criticalIssues.push(`Supabase client import failed: ${error.message}`);
    }
  }

  private async checkAuthActions(): Promise<void> {
    console.log('⚡ Checking auth actions...');
    
    try {
      const { signupAction, loginAction, forgotPasswordAction } = await import('./actions/auth-actions');
      
      this.report.authActions.canImportActions = true;
      this.report.authActions.signupActionExists = typeof signupAction === 'function';
      this.report.authActions.loginActionExists = typeof loginAction === 'function';
      
      console.log('✅ Auth actions imported successfully');
      
      if (!this.report.authActions.signupActionExists) {
        this.report.summary.criticalIssues.push('signupAction not found or not a function');
      }
      
      if (!this.report.authActions.loginActionExists) {
        this.report.summary.criticalIssues.push('loginAction not found or not a function');
      }
      
    } catch (error) {
      console.log('❌ Auth actions import failed:', error);
      this.report.authActions.errors.push(`Import failed: ${error.message}`);
      this.report.summary.criticalIssues.push(`Auth actions import failed: ${error.message}`);
    }
  }

  private async checkNetworkConnectivity(): Promise<void> {
    console.log('🌐 Checking network connectivity...');
    
    // Test API connectivity
    try {
      const apiUrl = this.report.environment.apiUrl || 'https://api.tenantflow.app';
      const healthUrl = `${apiUrl}/health`;
      
      const response = await fetch(healthUrl);
      this.report.networkConnectivity.canReachApi = true;
      this.report.networkConnectivity.apiHealthStatus = response.status;
      
      if (response.ok) {
        const data = await response.json();
        this.report.networkConnectivity.apiHealthResponse = data;
        console.log('✅ API health check passed');
      } else {
        this.report.summary.warnings.push(`API health check returned ${response.status}`);
        console.log(`⚠️ API health check returned ${response.status}`);
      }
    } catch (error) {
      console.log('❌ API connectivity test failed:', error);
      this.report.networkConnectivity.errors.push(`API connectivity failed: ${error.message}`);
      this.report.summary.warnings.push('Cannot reach API backend');
    }
    
    // Test Supabase connectivity
    try {
      const supabaseUrl = this.report.environment.supabaseUrl;
      if (supabaseUrl) {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Content-Type': 'application/json'
          }
        });
        
        this.report.networkConnectivity.canReachSupabase = true;
        this.report.networkConnectivity.supabaseStatus = response.status;
        console.log('✅ Supabase connectivity test passed');
      }
    } catch (error) {
      console.log('❌ Supabase connectivity test failed:', error);
      this.report.networkConnectivity.errors.push(`Supabase connectivity failed: ${error.message}`);
      this.report.summary.warnings.push('Cannot reach Supabase');
    }
  }

  private async checkFormElements(): Promise<void> {
    console.log('📋 Checking form elements...');
    
    // Check if we're on a page with forms
    const signupForm = document.querySelector('form') && window.location.pathname.includes('signup');
    const loginForm = document.querySelector('form') && window.location.pathname.includes('login');
    
    this.report.formElements.signupFormExists = signupForm;
    this.report.formElements.loginFormExists = loginForm;
    
    if (signupForm || loginForm) {
      const formDetails = {
        formCount: document.querySelectorAll('form').length,
        emailField: !!document.querySelector('input[name="email"]'),
        passwordField: !!document.querySelector('input[name="password"]'),
        submitButton: !!document.querySelector('button[type="submit"]'),
        nameField: !!document.querySelector('input[name="fullName"]'),
        confirmPasswordField: !!document.querySelector('input[name="confirmPassword"]')
      };
      
      this.report.formElements.formFieldDetails = formDetails;
      this.report.formElements.requiredFieldsPresent = formDetails.emailField && formDetails.passwordField && formDetails.submitButton;
      
      console.log('✅ Form elements checked:', formDetails);
    } else {
      console.log('ℹ️ No auth forms found on current page');
    }
  }

  private generateSummary(): void {
    console.log('📊 Generating diagnostic summary...');
    
    // Determine overall status
    if (this.report.summary.criticalIssues.length === 0) {
      if (this.report.summary.warnings.length === 0) {
        this.report.summary.overallStatus = 'healthy';
      } else {
        this.report.summary.overallStatus = 'degraded';
      }
    } else {
      this.report.summary.overallStatus = 'broken';
    }
    
    // Add recommendations
    if (!this.report.supabaseClient.initialized) {
      this.report.summary.recommendations.push('Check Supabase environment variables and client initialization');
    }
    
    if (!this.report.networkConnectivity.canReachApi) {
      this.report.summary.recommendations.push('Verify API backend is running and accessible');
    }
    
    if (this.report.supabaseClient.errors.length > 0) {
      this.report.summary.recommendations.push('Review Supabase client errors and fix configuration');
    }
    
    if (!this.report.authActions.canImportActions) {
      this.report.summary.recommendations.push('Check auth actions implementation and imports');
    }
    
    console.log(`📊 Overall status: ${this.report.summary.overallStatus.toUpperCase()}`);
  }

  printReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('AUTH DIAGNOSTIC REPORT');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${this.report.timestamp}`);
    console.log(`Overall Status: ${this.report.summary.overallStatus.toUpperCase()}`);
    console.log('');
    
    if (this.report.summary.criticalIssues.length > 0) {
      console.log('🚨 CRITICAL ISSUES:');
      this.report.summary.criticalIssues.forEach(issue => console.log(`  ❌ ${issue}`));
      console.log('');
    }
    
    if (this.report.summary.warnings.length > 0) {
      console.log('⚠️ WARNINGS:');
      this.report.summary.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
      console.log('');
    }
    
    console.log('📊 ENVIRONMENT:');
    console.log(`  Supabase URL: ${this.report.environment.supabaseUrl || 'NOT_SET'}`);
    console.log(`  Has Anon Key: ${this.report.environment.hasAnonKey ? '✅' : '❌'}`);
    console.log(`  API URL: ${this.report.environment.apiUrl || 'NOT_SET'}`);
    console.log('');
    
    console.log('🔧 SUPABASE CLIENT:');
    console.log(`  Initialized: ${this.report.supabaseClient.initialized ? '✅' : '❌'}`);
    console.log(`  Has Auth: ${this.report.supabaseClient.hasAuth ? '✅' : '❌'}`);
    console.log(`  Can Get Session: ${this.report.supabaseClient.canGetSession ? '✅' : '❌'}`);
    console.log(`  Can Get User: ${this.report.supabaseClient.canGetUser ? '✅' : '❌'}`);
    if (this.report.supabaseClient.errors.length > 0) {
      console.log('  Errors:');
      this.report.supabaseClient.errors.forEach(error => console.log(`    ❌ ${error}`));
    }
    console.log('');
    
    console.log('🌐 NETWORK:');
    console.log(`  Can Reach API: ${this.report.networkConnectivity.canReachApi ? '✅' : '❌'}`);
    console.log(`  API Health Status: ${this.report.networkConnectivity.apiHealthStatus || 'N/A'}`);
    console.log(`  Can Reach Supabase: ${this.report.networkConnectivity.canReachSupabase ? '✅' : '❌'}`);
    console.log('');
    
    if (this.report.summary.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS:');
      this.report.summary.recommendations.forEach(rec => console.log(`  💡 ${rec}`));
      console.log('');
    }
    
    console.log('='.repeat(80));
  }

  getReport(): AuthDiagnosticReport {
    return this.report;
  }
}

// Export for use
export { AuthDiagnosticTool, type AuthDiagnosticReport };

// Global function for easy console access
if (typeof window !== 'undefined') {
  (window as any).runAuthDiagnostic = async () => {
    const tool = new AuthDiagnosticTool();
    const report = await tool.runFullDiagnostic();
    tool.printReport();
    return report;
  };
  
  console.log('🔍 Auth diagnostic tool loaded. Run `runAuthDiagnostic()` in console for full analysis.');
}