"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlogStatusColor = exports.getBlogStatusLabel = exports.getBlogCategoryLabel = exports.BLOG_STATUS_OPTIONS = exports.BLOG_STATUS = exports.BLOG_CATEGORY_OPTIONS = exports.BLOG_CATEGORY = void 0;
exports.BLOG_CATEGORY = {
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
exports.BLOG_CATEGORY_OPTIONS = Object.values(exports.BLOG_CATEGORY);
exports.BLOG_STATUS = {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    ARCHIVED: 'ARCHIVED'
};
exports.BLOG_STATUS_OPTIONS = Object.values(exports.BLOG_STATUS);
const getBlogCategoryLabel = (category) => {
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
exports.getBlogCategoryLabel = getBlogCategoryLabel;
const getBlogStatusLabel = (status) => {
    const labels = {
        DRAFT: 'Draft',
        PUBLISHED: 'Published',
        ARCHIVED: 'Archived'
    };
    return labels[status] || status;
};
exports.getBlogStatusLabel = getBlogStatusLabel;
const getBlogStatusColor = (status) => {
    const colors = {
        DRAFT: 'bg-gray-100 text-gray-800',
        PUBLISHED: 'bg-green-100 text-green-800',
        ARCHIVED: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
exports.getBlogStatusColor = getBlogStatusColor;
