# TenantFlow n8n Workflows

This directory contains automated marketing workflows for the TenantFlow project using n8n, Ollama, and Discord integration.

## 🚀 Workflows Overview

### 1. **tenantflow-blog-approval-workflow.json**
**Advanced blog content generation with Discord approval system**
- Generates high-quality blog content using local Ollama LLM
- Sends posts to Discord #blog-post-approvals channel for review
- Automatically publishes approved content and promotes on social media
- Tracks approval status and maintains content drafts

**Features:**
- ✅ AI-powered content generation (800-1200 words)
- ✅ Discord integration with rich embeds and previews
- ✅ Approval workflow with unique tracking IDs
- ✅ Automatic Facebook posting after approval
- ✅ Content archiving and version control

**Schedule:** Weekly (Mondays at 9:00 AM)

---

### 2. **discord-approval-handler.json**
**Webhook handler for Discord approval interactions**
- Processes Discord reactions (✅ approve, ❌ reject, 📝 changes)
- Updates approval status in real-time
- Provides instant feedback to the approval team
- Archives rejected content for review

**Features:**
- ✅ Real-time Discord webhook processing
- ✅ Reaction-based approval system
- ✅ Status tracking and logging
- ✅ Automatic confirmation messages

**Trigger:** Discord webhook events

---

### 3. **tenantflow-social-media-automation.json**
**Multi-platform social media content automation**
- Creates platform-specific content for Facebook, Twitter, LinkedIn
- Uses local Ollama for content generation
- Posts 3x daily with varied content types and timing
- Includes tracking URLs and engagement optimization

**Features:**
- ✅ Multi-platform posting (Facebook, Twitter, LinkedIn)
- ✅ Content variety (tips, questions, statistics, educational)
- ✅ Time-optimized posting schedule
- ✅ UTM tracking for analytics

**Schedule:** Daily at 10:00 AM, 2:00 PM, 6:00 PM

---

### 4. **tenantflow-analytics-free.json**
**Free analytics collection and AI insights**
- Integrates with Umami (free Google Analytics alternative)
- Collects PostHog event data for user behavior
- Processes Google Search Console data
- Generates daily AI-powered insights and recommendations

**Features:**
- ✅ Free analytics tools integration
- ✅ Daily performance reports
- ✅ AI-generated insights using Ollama
- ✅ CSV export for data analysis
- ✅ Performance scoring and recommendations

**Schedule:** Daily at 8:00 AM

---

### 5. **tenantflow-lead-nurturing.json**
**Automated lead scoring and email nurturing**
- Processes new signups and user activity data
- Generates personalized follow-up emails using AI
- Calculates lead scores based on engagement
- Sends hot lead alerts to sales team

**Features:**
- ✅ Automated lead scoring algorithm
- ✅ Personalized email content generation
- ✅ Hot lead detection and sales alerts
- ✅ Multi-stage nurturing campaigns
- ✅ Resend integration for reliable delivery

**Schedule:** Daily at 11:00 AM (nurturing), 4:00 PM (scoring)

---

## 🔧 Setup Instructions

### Prerequisites
1. **n8n installation** on your Ubuntu server
2. **Ollama** running locally with llama3.2 model
3. **Discord webhook** configured for #blog-post-approvals channel
4. **Environment variables** configured

### Required Environment Variables
```bash
# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1390650940641513523/FTtdvSyGu5ifiJ3Apthy0d-DZbgr7pIbZhVKMdBC0OV3hPSPb1VROhOK_O78TbNDYQFy

# Facebook (from .env.facebook)
FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_ACCESS_TOKEN=your_access_token

# Twitter/X
TWITTER_BEARER_TOKEN=your_bearer_token

# LinkedIn
LINKEDIN_ACCESS_TOKEN=your_access_token
LINKEDIN_ORGANIZATION_ID=your_org_id

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_API_URL=https://api.resend.com/emails

# Analytics
UMAMI_WEBSITE_ID=your_umami_site_id
UMAMI_API_TOKEN=your_umami_token
POSTHOG_HOST=https://app.posthog.com
POSTHOG_PROJECT_ID=your_project_id
POSTHOG_API_KEY=your_posthog_key
GOOGLE_SEARCH_CONSOLE_TOKEN=your_gsc_token

# General
SITE_URL=https://tenantflow.app
SALES_TEAM_EMAIL=sales@tenantflow.app
```

### Directory Structure
The workflows expect the following directory structure on your Ubuntu server:

```
/home/user/tenantflow-content/
├── blog-posts/           # Published blog posts
├── blog-drafts/          # Draft posts awaiting approval
├── blog-rejected/        # Rejected posts archive
├── social-posts/         # Social media post data
├── social-media/         # Generated social content
├── leads/               # Lead data and email logs
├── analytics/           # Daily analytics reports
├── approvals/           # Approval status tracking
└── logs/               # Activity logs
```

### Installation Steps

1. **Create directories:**
```bash
mkdir -p /home/user/tenantflow-content/{blog-posts,blog-drafts,blog-rejected,social-posts,social-media,leads,analytics,approvals,logs}
```

2. **Import workflows:**
   - Open n8n web interface
   - Go to Workflows → Import
   - Upload each JSON file from this directory
   - Configure environment variables in n8n settings

3. **Configure Discord webhook:**
   - The webhook URL is already configured: `https://discord.com/api/webhooks/1390650940641513523/FTtdvSyGu5ifiJ3Apthy0d-DZbgr7pIbZhVKMdBC0OV3hPSPb1VROhOK_O78TbNDYQFy`
   - Test webhook by triggering the blog approval workflow

4. **Start Ollama:**
```bash
ollama serve
ollama pull llama3.2
```

5. **Activate workflows:**
   - Enable each workflow in n8n
   - Test with manual execution
   - Monitor logs for any issues

## 📊 Discord Approval Process

### How It Works
1. **Content Generation:** Blog workflow generates content weekly
2. **Discord Notification:** Rich embed sent to #blog-post-approvals
3. **Review Process:** Team members react with:
   - ✅ **Approve** - Publishes immediately and promotes on social media
   - ❌ **Reject** - Archives content and generates new post next cycle
   - 📝 **Request Changes** - Flags for manual editing (future enhancement)
4. **Confirmation:** Discord confirms action with status update
5. **Publication:** Approved posts automatically publish and promote

### Discord Message Format
```
📝 New Blog Post Ready for Review

**[Blog Title]**
[Meta description preview...]

📊 Details
Word Count: XXX
Category: Property Management
Keywords: property management, landlord tips...
Author: TenantFlow Team

📅 Publishing
Scheduled: YYYY-MM-DD
Status: Pending Approval
ID: blog_1234567890

React with ✅ to approve, ❌ to reject, or 📝 to request changes
```

## 🔍 Monitoring & Analytics

### Log Files
- `analytics.log` - Daily analytics processing
- `blog-approval-requests.log` - Blog approval workflow
- `discord-approvals.log` - Discord interaction processing
- `lead-nurturing.log` - Email campaigns and lead scoring
- `social-media.log` - Social media posting activity

### Performance Tracking
- **Blog Performance:** Track approval rates, publication success, social engagement
- **Social Media:** Monitor posting frequency, platform-specific engagement
- **Lead Nurturing:** Track email open rates, lead conversion, scoring accuracy
- **Analytics:** Daily traffic, bounce rates, search performance

## 🚀 Benefits & ROI

### Content Marketing Automation
- **Blog Posts:** 52 high-quality posts per year (weekly generation)
- **Social Media:** 1,095 posts per year (3x daily across platforms)
- **Lead Nurturing:** Personalized emails based on user behavior
- **Analytics:** Daily insights for data-driven decisions

### Cost Savings
- **Content Creation:** $0 (using local Ollama vs $500+/month for writers)
- **Social Media Management:** $0 (vs $200+/month for tools)
- **Analytics:** $0 (free tools vs $150+/month for premium analytics)
- **Email Marketing:** $20/month (Resend vs $100+/month for enterprise)

### Time Savings
- **Content Planning:** Automated vs 10 hours/week manual
- **Social Media:** Automated vs 5 hours/week manual
- **Lead Follow-up:** Automated vs 8 hours/week manual
- **Analytics Reporting:** Automated vs 3 hours/week manual

**Total Time Saved:** ~26 hours/week = 1,352 hours/year

## 🔧 Troubleshooting

### Common Issues

1. **Ollama Connection Failed**
   ```bash
   # Check if Ollama is running
   curl http://localhost:11434/api/tags
   
   # Restart if needed
   ollama serve
   ```

2. **Discord Webhook Not Working**
   - Verify webhook URL is correct
   - Check Discord server permissions
   - Test with curl: `curl -X POST [webhook_url] -H "Content-Type: application/json" -d '{"content":"test"}'`

3. **File Permission Errors**
   ```bash
   # Fix directory permissions
   chmod -R 755 /home/user/tenantflow-content/
   chown -R $(whoami) /home/user/tenantflow-content/
   ```

4. **Social Media API Errors**
   - Check token expiration dates
   - Verify API permissions
   - Test tokens manually with API documentation

### Support
- Check n8n logs for detailed error messages
- Review workflow execution history
- Monitor server resources (CPU, memory, disk space)
- Test individual nodes for debugging

---

## 🎯 14-Workflow Lead Magnet Revenue System

### **New Revenue-Focused Lead Magnet Rotation**
A sophisticated 28-day rotation system with 14 specialized workflows firing every other day:

**✅ ALL 14 WORKFLOWS COMPLETE:**
- ✅ **lead-magnet-01-tenant-screening.json** - Days 1, 15, 29
- ✅ **lead-magnet-02-financial-roi.json** - Days 2, 16, 30  
- ✅ **lead-magnet-03-maintenance-management.json** - Days 3, 17, 31
- ✅ **lead-magnet-04-marketing-vacancy.json** - Days 4, 18
- ✅ **lead-magnet-05-property-investment.json** - Days 5, 19
- ✅ **lead-magnet-06-insurance-risk.json** - Days 6, 20
- ✅ **lead-magnet-07-technology-automation.json** - Days 7, 21
- ✅ **lead-magnet-08-seasonal-management.json** - Days 8, 22
- ✅ **lead-magnet-09-tenant-communication.json** - Days 9, 23
- ✅ **lead-magnet-10-market-analysis.json** - Days 10, 24
- ✅ **lead-magnet-11-exit-strategies.json** - Days 11, 25
- ✅ **lead-magnet-12-legal-compliance.json** - Days 12, 26 (moved to end - less engaging)
- ✅ **lead-magnet-13-portfolio-scaling.json** - Days 13, 27
- ✅ **lead-magnet-14-emergency-management.json** - Days 14, 28

**🎯 Complete 28-Day Rotation System Active**

### **Revenue Projections (Full System)**
```
Monthly Downloads: 2,100-2,800 lead magnets
Email Signups: 315-420 per month
Trial Conversions: 220-295 per month
Monthly New Revenue: $10,340-$13,865
Annual Revenue Impact: $124,080-$166,380
```

### **File Organization**
```
/home/user/tenantflow-content/
├── lead-magnets/2024/Q1/tenant-screening/
├── lead-magnets/2024/Q1/legal-compliance/
├── lead-magnets/2024/Q1/financial-roi/
├── landing-pages/2024/Q1/[category]/
└── reports/quarterly-cleanup-candidates.json
```

**Quarterly cleanup removes low-traffic files automatically.**

See `LEAD-MAGNET-SYSTEM-OVERVIEW.md` for complete implementation details.

---

## 💰 Revenue-Generating Workflows Collection

### **Lead Generation & Conversion**
1. **automated-lead-magnet-generator.json** - Creates valuable free resources
2. **lead-magnet-01-tenant-screening.json** - Tenant screening specialists  
3. **lead-magnet-02-financial-roi.json** - Investment & ROI optimization
4. **lead-magnet-12-legal-compliance.json** - Legal protection focus (end of cycle)

### **Customer Revenue Optimization**
5. **freemium-to-paid-converter.json** - Convert free users to paid
6. **upsell-automation-engine.json** - Upgrade existing customers
7. **churn-prevention-revenue-saver.json** - Prevent subscription cancellations

### **Partnership Revenue**
8. **affiliate-program-automation.json** - Recruit & manage affiliates

### **Content & SEO Revenue**
9. **local-seo-content-generator.json** - Regional traffic capture
10. **competitor-content-analysis.json** - Content gap opportunities

**Total Revenue Impact: $25,000-$60,000 annually**

---

## 🎯 Future Enhancements

### Planned Features
- **Content Calendar:** Visual scheduling and planning interface
- **A/B Testing:** Automated testing of different content variations
- **Advanced Analytics:** Custom dashboards and deeper insights
- **Multi-language Support:** Content generation in multiple languages
- **Image Generation:** AI-powered blog post images
- **Video Content:** Automated video script generation
- **Influencer Outreach:** Automated relationship building
- **SEO Optimization:** Advanced keyword research and optimization

### Integration Opportunities
- **CRM Integration:** Sync leads with Salesforce/HubSpot
- **E-commerce:** Product promotion automation
- **Customer Support:** AI-powered response generation
- **Community Building:** Discord community management
- **Event Marketing:** Automated event promotion