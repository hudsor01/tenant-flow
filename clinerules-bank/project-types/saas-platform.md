# SaaS Platform Development Rules

## Multi-Tenant Architecture Requirements
- **Data Isolation**: Every tenant's data must be completely isolated
- **Org-Scoped Queries**: All database operations scoped to organization
- **Subscription Management**: Proper billing and subscription lifecycle handling
- **Feature Flagging**: Tenant-specific feature toggles based on subscription

## Security for SaaS
- **Tenant Boundaries**: Enforce strict tenant data boundaries
- **API Rate Limiting**: Per-tenant rate limiting and quotas
- **Audit Logging**: Comprehensive audit trails for compliance
- **Data Encryption**: Encrypt sensitive tenant data at rest

## Scalability Considerations
- **Database Sharding**: Plan for horizontal scaling strategies
- **Caching Strategy**: Multi-tenant aware caching with proper isolation
- **Background Jobs**: Tenant-scoped background job processing
- **Resource Quotas**: Implement and enforce per-tenant resource limits

## SaaS-Specific Features
- **Onboarding Flow**: Streamlined tenant onboarding process
- **Billing Integration**: Automated billing and invoice generation
- **Usage Analytics**: Per-tenant usage tracking and reporting
- **Self-Service**: Tenant admin self-service capabilities

## Compliance & Legal
- **Data Residency**: Support for data residency requirements
- **GDPR Compliance**: Data deletion and export capabilities
- **SOC2 Requirements**: Security controls and audit readiness
- **Terms of Service**: Clear tenant agreements and usage policies

## Performance for Scale
- **Database Performance**: Optimized queries for multi-tenant patterns
- **CDN Strategy**: Geographic distribution for global tenants
- **Monitoring**: Per-tenant performance monitoring and alerting
- **Auto-Scaling**: Dynamic resource allocation based on usage

## Development Workflow
- **Tenant Test Data**: Isolated test environments per feature branch
- **Migration Strategy**: Zero-downtime deployments for all tenants
- **Feature Rollouts**: Gradual feature rollouts with tenant selection
- **Support Tools**: Tenant-specific debugging and support capabilities