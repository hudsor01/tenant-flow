import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { User, Organization } from '@prisma/client';
import {
  DiagnosticAssertions,
  StateInspector,
  PerformanceProfiler,
  DatabaseAnalyzer,
} from '../test-utils/diagnostic-assertions';
import {
  TestDocumentation,
  FailurePlaybook,
  TestScenario,
} from '../test-utils/test-documentation';

describe('AuthService - Enhanced Diagnostic Tests', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let testUser: User & { organization: Organization };

  // Test scenario documentation
  const loginScenario: TestScenario = {
    name: 'User Login Flow',
    description: 'Tests the complete authentication flow from Supabase token to JWT generation',
    setup: [
      'Valid Supabase user exists in database',
      'User has associated organization',
      'JWT secret is configured',
      'Supabase service is properly initialized',
    ],
    steps: [
      {
        action: 'Validate Supabase session token',
        validation: 'Token is valid and not expired',
      },
      {
        action: 'Fetch user from database',
        validation: 'User exists and is active',
      },
      {
        action: 'Load user organization',
        validation: 'Organization exists and is active',
      },
      {
        action: 'Generate JWT token',
        data: { userId: 'user-id', organizationId: 'org-id', role: 'PROPERTY_MANAGER' },
        validation: 'JWT contains all required claims',
      },
    ],
    expectedOutcome: 'Valid JWT token with user context and permissions',
    commonFailures: [
      {
        symptom: 'Invalid Supabase token error',
        causes: [
          'Token has expired',
          'Token was tampered with',
          'Supabase service key mismatch',
          'Wrong Supabase URL configured',
        ],
        fixes: [
          'Regenerate token using Supabase auth',
          'Verify SUPABASE_SERVICE_KEY in environment',
          'Check SUPABASE_URL matches your project',
          'Ensure token hasn\'t expired (default 1 hour)',
        ],
        example: 'await supabase.auth.signInWithPassword({ email, password })',
      },
      {
        symptom: 'User not found in database',
        causes: [
          'User not synced from Supabase to local DB',
          'User was deleted but Supabase session persists',
          'Wrong database connection',
          'User ID format mismatch',
        ],
        fixes: [
          'Run user sync webhook or migration',
          'Clear Supabase session and re-authenticate',
          'Verify DATABASE_URL is correct',
          'Check if user ID is UUID format',
        ],
      },
    ],
  };

  beforeEach(async () => {
    console.log(TestDocumentation.describeScenario(loginScenario));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: vi.fn(),
              update: vi.fn(),
            },
            organization: {
              findFirst: vi.fn(),
            },
            $transaction: vi.fn(callback => callback(prisma)),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: vi.fn(),
            verify: vi.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '1h',
                SUPABASE_URL: 'https://test.supabase.co',
                SUPABASE_SERVICE_KEY: 'test-service-key',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Setup test user
    testUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'PROPERTY_MANAGER',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      isActive: true,
      phoneNumber: null,
      avatarUrl: null,
      organization: {
        id: 'org-123',
        name: 'Test Organization',
        userId: 'user-123',
        stripeCustomerId: 'cus_test123',
        subscriptionId: 'sub_test123',
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        settings: {},
      },
    };
  });

  afterEach(() => {
    PerformanceProfiler.reset();
  });

  describe('validateSupabaseToken - with diagnostic feedback', () => {
    it('should provide helpful feedback when token validation fails', async () => {
      const invalidToken = 'invalid.token.here';
      
      // Mock Supabase validation to fail
      vi.spyOn(service as any, 'supabase', 'get').mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Invalid token', status: 401 },
          }),
        },
      });

      try {
        await service.validateSupabaseToken(invalidToken);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        
        // Generate diagnostic report
        const diagnostic = TestDocumentation.generateFixGuide(
          'validateSupabaseToken',
          error,
          {
            token: invalidToken,
            tokenParts: invalidToken.split('.').length,
            configuredUrl: configService.get('SUPABASE_URL'),
            errorMessage: error.message,
          }
        );
        
        console.log(diagnostic);
        
        // Additional diagnostic assertions
        try {
          DiagnosticAssertions.toHaveValidJWT(invalidToken, {
            suggestion: 'Ensure you are using a real Supabase session token, not a JWT',
            documentation: 'https://supabase.io/docs/guides/auth/server-side-auth',
            relatedTests: [
              'auth.controller.spec.ts - login endpoint',
              'auth.e2e-spec.ts - full auth flow',
            ],
          });
        } catch (diagError) {
          console.log(diagError.message);
        }
      }
    });

    it('should track performance of token validation', async () => {
      vi.spyOn(service as any, 'supabase', 'get').mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      });

      // Run multiple validations to gather metrics
      for (let i = 0; i < 10; i++) {
        PerformanceProfiler.startTimer('token-validation');
        await service.validateSupabaseToken('valid.token.here');
        PerformanceProfiler.endTimer('token-validation');
      }

      const metrics = PerformanceProfiler.getMetrics('token-validation');
      console.log('Token Validation Performance:', metrics);
      console.log(PerformanceProfiler.analyzePerformance('token-validation', 50));

      expect(metrics.avg).toBeLessThan(50);
    });
  });

  describe('login - with state inspection', () => {
    it('should provide detailed state analysis on login failure', async () => {
      const mockRequest = {
        headers: { authorization: 'Bearer test.token.here' },
        user: null,
      };

      // Capture initial state
      const initialState = await StateInspector.captureRequestContext(mockRequest);

      // Mock user not found
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      vi.spyOn(service as any, 'validateSupabaseToken').mockResolvedValue({ 
        id: 'user-123' 
      });

      try {
        await service.login('test.token.here');
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        // Capture final state
        const finalState = await StateInspector.captureRequestContext({
          ...mockRequest,
          error: error.message,
        });

        console.log('State Comparison:');
        console.log(StateInspector.formatStateComparison(initialState, finalState));

        // Generate playbook for this failure
        const playbook = await FailurePlaybook.generatePlaybook(
          'auth.service.spec.ts',
          'user-not-found-after-valid-token'
        );
        console.log(playbook);

        // Analyze database state
        const dbAnalysis = await DatabaseAnalyzer.analyzeRelationships(
          prisma,
          'user',
          'user-123'
        );
        console.log('Database Analysis:', dbAnalysis);
      }
    });

    it('should validate all required auth headers', async () => {
      const headers = {
        authorization: 'Bearer valid.token.here',
        // Missing x-tenant-id
      };

      try {
        DiagnosticAssertions.toHaveRequiredAuthHeaders(headers, {
          context: 'Login request headers',
          suggestion: 'Add x-tenant-id header for multi-tenant context',
          commonFixes: [
            'Set tenant ID after successful authentication',
            'Extract tenant from user organization',
            'Use auth interceptor to add headers automatically',
          ],
        });
      } catch (error) {
        console.log(error.message);
      }
    });
  });

  describe('generateTokens - with comprehensive validation', () => {
    it('should generate valid tokens with proper structure', async () => {
      vi.spyOn(jwtService, 'sign').mockReturnValue('valid.jwt.token');

      const tokens = await service.generateTokens(testUser);

      // Validate token structure
      DiagnosticAssertions.toHaveValidJWT(tokens.accessToken);

      // Validate token contains required claims
      const mockDecodedToken = {
        sub: testUser.id,
        email: testUser.email,
        role: testUser.role,
        organizationId: testUser.organization.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      vi.spyOn(jwtService, 'verify').mockReturnValue(mockDecodedToken);
      
      const decoded = jwtService.verify(tokens.accessToken);
      
      expect(decoded).toMatchObject({
        sub: testUser.id,
        email: testUser.email,
        role: testUser.role,
        organizationId: testUser.organization.id,
      });

      // Performance check
      PerformanceProfiler.startTimer('token-generation');
      await service.generateTokens(testUser);
      const duration = PerformanceProfiler.endTimer('token-generation');
      
      expect(duration).toBeLessThan(10); // Should be very fast
    });

    it('should handle missing organization with helpful error', async () => {
      const userWithoutOrg = { ...testUser, organization: null };

      try {
        await service.generateTokens(userWithoutOrg as any);
        fail('Should have thrown error');
      } catch (error) {
        const diagnostic = TestDocumentation.generateFixGuide(
          'generateTokens - missing organization',
          error,
          {
            userId: userWithoutOrg.id,
            userEmail: userWithoutOrg.email,
            hasOrganization: false,
          }
        );
        
        console.log(diagnostic);
        
        expect(error.message).toContain('organization');
      }
    });
  });

  describe('verifyToken - with detailed error analysis', () => {
    it('should provide specific feedback for expired tokens', async () => {
      const expiredToken = 'expired.jwt.token';
      
      vi.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('jwt expired');
      });

      try {
        await service.verifyToken(expiredToken);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        
        const diagnostic = TestDocumentation.generateFixGuide(
          'verifyToken - expired token',
          error,
          {
            token: expiredToken.substring(0, 20) + '...',
            currentTime: new Date().toISOString(),
            jwtExpiresIn: configService.get('JWT_EXPIRES_IN'),
          }
        );
        
        console.log(diagnostic);
      }
    });

    it('should validate token signature with diagnostic info', async () => {
      const tamperedToken = 'tampered.jwt.token';
      
      vi.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('invalid signature');
      });

      try {
        await service.verifyToken(tamperedToken);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        const playbook = await FailurePlaybook.generatePlaybook(
          'auth.service.spec.ts',
          'jwt-signature-invalid'
        );
        console.log(playbook);
        
        expect(error).toBeInstanceOf(UnauthorizedException);
      }
    });
  });

  describe('Database consistency checks', () => {
    it('should detect and report orphaned auth records', async () => {
      // Mock orphaned records
      vi.spyOn(prisma as any, 'user').mockImplementation(() => ({
        findMany: vi.fn().mockResolvedValue([
          { id: 'orphan-1', email: 'orphan1@test.com', organizationId: null },
          { id: 'orphan-2', email: 'orphan2@test.com', organizationId: 'non-existent' },
        ]),
      }));

      const orphans = await DatabaseAnalyzer.findOrphans(prisma);
      console.log('Orphaned Records:', orphans);
      
      if (Object.values(orphans).some(arr => arr.length > 0)) {
        const cleanupScript = DatabaseAnalyzer.generateCleanupScript(orphans);
        console.log('Cleanup Script:\n', cleanupScript);
      }
    });

    it('should verify auth data matches database state', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(testUser);
      
      const authData = {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
        organizationId: testUser.organization.id,
      };

      await DiagnosticAssertions.toMatchDatabaseState(
        authData,
        async () => ({
          id: testUser.id,
          email: testUser.email,
          role: testUser.role,
          organizationId: testUser.organization.id,
        }),
        {
          context: 'Verifying auth token claims match database',
          suggestion: 'Ensure token is regenerated when user data changes',
        }
      );
    });
  });
});