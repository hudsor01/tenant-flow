/**
 * Blog and content management types
 * All types related to blog articles, tags, and content management
 */
export const BLOG_CATEGORY = {
    PROPERTY_MANAGEMENT: 'PROPERTY_MANAGEMENT',
    REAL_ESTATE: 'REAL_ESTATE',
    LANDLORD_TIPS: 'LANDLORD_TIPS',
    TENANT_RESOURCES: 'TENANT_RESOURCES',
    LEGAL_ADVICE: 'LEGAL_ADVICE',
    MAINTENANCE: 'MAINTENANCE',
    TECHNOLOGY: 'TECHNOLOGY',
    MARKET_TRENDS: 'MARKET_TRENDS',
    INDUSTRY_NEWS: 'INDUSTRY_NEWS',
    COMPANY_NEWS: 'COMPANY_NEWS'
};
export const BLOG_CATEGORY_OPTIONS = Object.values(BLOG_CATEGORY);
export const BLOG_STATUS = {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    ARCHIVED: 'ARCHIVED'
};
export const BLOG_STATUS_OPTIONS = Object.values(BLOG_STATUS);
// Blog display helpers
export const getBlogCategoryLabel = (category) => {
    const labels = {
        PROPERTY_MANAGEMENT: 'Property Management',
        REAL_ESTATE: 'Real Estate',
        LANDLORD_TIPS: 'Landlord Tips',
        TENANT_RESOURCES: 'Tenant Resources',
        LEGAL_ADVICE: 'Legal Advice',
        MAINTENANCE: 'Maintenance',
        TECHNOLOGY: 'Technology',
        MARKET_TRENDS: 'Market Trends',
        INDUSTRY_NEWS: 'Industry News',
        COMPANY_NEWS: 'Company News'
    };
    return labels[category] || category;
};
export const getBlogStatusLabel = (status) => {
    const labels = {
        DRAFT: 'Draft',
        PUBLISHED: 'Published',
        ARCHIVED: 'Archived'
    };
    return labels[status] || status;
};
export const getBlogStatusColor = (status) => {
    const colors = {
        DRAFT: 'bg-gray-100 text-gray-800',
        PUBLISHED: 'bg-green-100 text-green-800',
        ARCHIVED: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
//# sourceMappingURL=blog.js.map