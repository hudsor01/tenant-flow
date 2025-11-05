-- Seed FAQ data
-- This script populates the FAQ tables with initial content

BEGIN;

-- Insert FAQ categories
INSERT INTO faq_categories (name, slug, description, display_order) VALUES
('Getting Started', 'getting-started', 'Learn the basics of TenantFlow', 1),
('Features & Benefits', 'features-benefits', 'Discover what makes TenantFlow powerful', 2),
('Implementation & Support', 'implementation-support', 'Get help with setup and ongoing support', 3),
('Security & Compliance', 'security-compliance', 'Your data security and regulatory compliance', 4),
('Pricing & ROI', 'pricing-roi', 'Understand pricing and guaranteed returns', 5);

-- Insert FAQ questions for "Getting Started"
INSERT INTO faq_questions (category_id, question, answer, display_order) VALUES
((SELECT id FROM faq_categories WHERE slug = 'getting-started'), 'How quickly can TenantFlow increase my NOI?', 'Most property managers see a 40% increase in NOI within 90 days. Our portfolio optimization tools, reduced vacancy periods (65% faster filling), and 32% maintenance cost reduction deliver immediate results. We guarantee ROI within the first 90 days or your money back.', 1),
((SELECT id FROM faq_categories WHERE slug = 'getting-started'), 'What makes TenantFlow different from other property management software?', 'TenantFlow is the only platform that guarantees a 40% NOI increase. While others focus on basic tasks, we provide enterprise-grade automation that handles 80% of your daily work automatically. Our clients save 20+ hours per week and reduce operational costs by 32% on average.', 2),
((SELECT id FROM faq_categories WHERE slug = 'getting-started'), 'How much money will I save with TenantFlow?', 'The average property manager saves $2,400+ per property per year with TenantFlow. This comes from reduced vacancy time (65% faster), lower maintenance costs (32% reduction), streamlined operations, and eliminated manual tasks. Most clients see full ROI within 2.3 months.', 3);

-- Insert FAQ questions for "Features & Benefits"
INSERT INTO faq_questions (category_id, question, answer, display_order) VALUES
((SELECT id FROM faq_categories WHERE slug = 'features-benefits'), 'How does TenantFlow automate 80% of daily tasks?', 'Our smart workflows handle maintenance tracking, lease renewals, maintenance requests, tenant communications, and financial reporting automatically. AI-powered tenant screening, automated notifications, and smart vendor dispatch save you 20+ hours per week.', 1),
((SELECT id FROM faq_categories WHERE slug = 'features-benefits'), 'What specific results can I expect?', 'Based on 10,000+ properties managed: 40% average NOI increase, 65% faster vacancy filling, 32% maintenance cost reduction, 80% task automation, and 90% reduction in bad tenants through advanced screening. All results are tracked and guaranteed.', 2),
((SELECT id FROM faq_categories WHERE slug = 'features-benefits'), 'Is TenantFlow suitable for my portfolio size?', 'Yes! TenantFlow scales from 1 property to unlimited portfolios. Starter plan handles 1-5 properties, Growth plan manages up to 100 units, and TenantFlow Max supports unlimited properties with white-label options and dedicated account management.', 3);

-- Insert FAQ questions for "Implementation & Support"
INSERT INTO faq_questions (category_id, question, answer, display_order) VALUES
((SELECT id FROM faq_categories WHERE slug = 'implementation-support'), 'How long does setup take?', 'Most property managers are fully operational within 24-48 hours. Our onboarding specialists handle data migration, system configuration, and team training. You can start seeing results immediately with our automated workflows going live on day one.', 1),
((SELECT id FROM faq_categories WHERE slug = 'implementation-support'), 'What kind of support do you provide?', 'All plans include priority email support with 4-hour response times. Growth and Max plans get phone support and dedicated account managers. Our team includes property management experts who understand your challenges and provide strategic guidance.', 2),
((SELECT id FROM faq_categories WHERE slug = 'implementation-support'), 'Do you integrate with my existing systems?', 'TenantFlow integrates with all major accounting software, payment processors, and maintenance platforms. Our API connects with 500+ business tools. Custom integrations are available for TenantFlow Max customers with dedicated development support.', 3);

-- Insert FAQ questions for "Security & Compliance"
INSERT INTO faq_questions (category_id, question, answer, display_order) VALUES
((SELECT id FROM faq_categories WHERE slug = 'security-compliance'), 'How secure is my data?', 'TenantFlow uses bank-level security with 256-bit SSL encryption, SOC 2 Type II compliance, and regular security audits. Your data is backed up across multiple secure data centers with 99.9% uptime SLA and enterprise-grade protection.', 1),
((SELECT id FROM faq_categories WHERE slug = 'security-compliance'), 'Do you comply with rental regulations?', 'Yes, TenantFlow automatically handles compliance for all 50 states including fair housing laws, rent control regulations, eviction procedures, and tenant rights. Our legal team updates the system continuously as regulations change.', 2);

-- Insert FAQ questions for "Pricing & ROI"
INSERT INTO faq_questions (category_id, question, answer, display_order) VALUES
((SELECT id FROM faq_categories WHERE slug = 'pricing-roi'), 'What if TenantFlow doesn''t deliver the promised results?', 'We guarantee 40% NOI increase within 90 days or your money back. If you don''t see measurable improvements in operational efficiency, cost reduction, and revenue optimization, we''ll refund your subscription completely.', 1),
((SELECT id FROM faq_categories WHERE slug = 'pricing-roi'), 'Are there any hidden fees?', 'No hidden fees ever. Our transparent pricing includes all features, unlimited support, regular updates, and data migration. The only additional cost is if you choose premium add-ons like custom integrations or dedicated training sessions.', 2),
((SELECT id FROM faq_categories WHERE slug = 'pricing-roi'), 'Can I try TenantFlow risk-free?', 'Yes! Start with our 14-day transformation trial - no credit card required. Experience the full platform, see real results, and if you''re not completely satisfied, there''s no obligation to continue.', 3);

COMMIT;