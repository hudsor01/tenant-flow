/**
 * Row Level Security (RLS) Types for Multi-Tenant Security
 *
 * These types support the multi-tenant architecture by providing
 * consistent interfaces for RLS policy management, auditing, and monitoring
 * across the entire application stack.
 */
/**
 * Raw RLS Policy from PostgreSQL pg_policies view
 * Direct mapping of database RLS policy information
 */
export interface RLSPolicy {
    /** Database schema name */
    schemaname: string;
    /** Table name */
    tablename: string;
    /** Policy name/identifier */
    policyname: string;
    /** Policy type: PERMISSIVE or RESTRICTIVE */
    permissive: string;
    /** Database roles this policy applies to */
    roles: string[];
    /** SQL command: SELECT, INSERT, UPDATE, DELETE, ALL */
    cmd: string;
    /** WHERE clause condition for the policy */
    qual: string;
    /** WITH CHECK condition for INSERT/UPDATE operations */
    with_check: string;
}
/**
 * High-level RLS status for a database table
 * Used for admin dashboards and security monitoring
 */
export interface RLSTableStatus {
    /** Table name */
    table: string;
    /** Whether RLS is enabled on this table */
    enabled: boolean;
    /** Number of policies configured for this table */
    policyCount: number;
    /** List of policy names */
    policyNames: string[];
    /** Last time this table's RLS was audited */
    lastAudit?: Date;
}
/**
 * Simplified RLS policy information for API responses
 * Provides essential policy details without PostgreSQL internals
 */
export interface RLSPolicyInfo {
    /** Policy name */
    name: string;
    /** Table this policy applies to */
    tableName: string;
    /** Whether policy is currently active */
    enabled: boolean;
    /** Human-readable policy description */
    description: string;
    /** SQL operations this policy covers */
    operations: string[];
    /** Roles this policy applies to */
    roles: string[];
}
/**
 * Comprehensive RLS audit report
 * Used for security compliance and monitoring dashboards
 */
export interface RLSAuditReport {
    /** Timestamp when audit was generated */
    timestamp: string;
    /** RLS status for all critical tables */
    tableStatuses: RLSTableStatus[];
    /** Detailed policy information by table */
    policies: Record<string, RLSPolicyInfo[]>;
    /** Security recommendations and warnings */
    recommendations: string[];
    /** Overall security score (0-100) */
    securityScore: number;
    /** Critical issues that need immediate attention */
    criticalIssues: string[];
}
/**
 * RLS test result for a specific scenario
 * Used for automated security testing
 */
export interface RLSTestResult {
    /** Test scenario name */
    scenario: string;
    /** Table being tested */
    table: string;
    /** Operation being tested */
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    /** Whether test passed (access properly restricted) */
    passed: boolean;
    /** Test description */
    description: string;
    /** Error message if test failed */
    error?: string;
}
/**
 * Complete RLS test suite results
 * Comprehensive security validation report
 */
export interface RLSTestSuite {
    /** Timestamp when tests were run */
    timestamp: string;
    /** User context used for testing */
    testUserId: string;
    /** User role used for testing */
    testUserRole: string;
    /** Individual test results */
    tests: RLSTestResult[];
    /** Overall test summary */
    summary: {
        total: number;
        passed: number;
        failed: number;
        successRate: number;
    };
    /** Critical security failures */
    criticalFailures: RLSTestResult[];
}
/**
 * RLS configuration for a table
 * Used when setting up RLS policies programmatically
 */
export interface RLSTableConfig {
    /** Table name */
    tableName: string;
    /** Whether to enable RLS on this table */
    enableRLS: boolean;
    /** Policies to create for this table */
    policies: {
        name: string;
        operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
        roles: string[];
        condition: string;
        withCheck?: string;
    }[];
}
/**
 * Multi-tenant RLS validation result
 * Ensures proper tenant isolation
 */
export interface TenantIsolationTest {
    /** Tenant ID being tested */
    tenantId: string;
    /** Tables tested for isolation */
    tablesTested: string[];
    /** Whether tenant can only access their own data */
    properlyIsolated: boolean;
    /** Any data leakage detected */
    leakageDetected: {
        table: string;
        unauthorizedAccess: boolean;
        details: string;
    }[];
    /** Test timestamp */
    timestamp: string;
}
//# sourceMappingURL=rls.d.ts.map