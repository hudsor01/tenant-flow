-- CreateEnum
CREATE TYPE "BlogCategory" AS ENUM ('PROPERTY_MANAGEMENT', 'LEGAL_COMPLIANCE', 'FINANCIAL_MANAGEMENT', 'PROPERTY_MAINTENANCE', 'SOFTWARE_REVIEWS', 'TENANT_RELATIONS', 'MARKETING', 'REAL_ESTATE_INVESTMENT', 'TAX_PLANNING', 'AUTOMATION');

-- CreateEnum
CREATE TYPE "BlogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "CustomerInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LEASE', 'INVOICE', 'RECEIPT', 'PROPERTY_PHOTO', 'INSPECTION', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREETRIAL', 'STARTER', 'GROWTH', 'TENANTFLOW_MAX');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'TENANT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ActivityEntityType" AS ENUM ('property', 'tenant', 'maintenance', 'payment', 'lease', 'unit');

-- CreateTable
CREATE TABLE "BlogArticle" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImage" TEXT,
    "category" "BlogCategory" NOT NULL DEFAULT 'PROPERTY_MANAGEMENT',
    "status" "BlogStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ(6),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "readTime" INTEGER,
    "searchKeywords" TEXT[],
    "lastIndexed" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogTag" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerInvoice" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "invoiceNumber" TEXT NOT NULL,
    "status" "CustomerInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "businessName" TEXT NOT NULL,
    "businessEmail" TEXT NOT NULL,
    "businessAddress" TEXT,
    "businessCity" TEXT,
    "businessState" TEXT,
    "businessZip" TEXT,
    "businessPhone" TEXT,
    "businessLogo" TEXT,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientAddress" TEXT,
    "clientCity" TEXT,
    "clientState" TEXT,
    "clientZip" TEXT,
    "issueDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMPTZ(6) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "terms" TEXT,
    "emailCaptured" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "isProVersion" BOOLEAN NOT NULL DEFAULT false,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerInvoiceItem" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "propertyId" TEXT,
    "leaseId" TEXT,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "fileSizeBytes" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" TEXT NOT NULL,
    "maintenanceId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(6) NOT NULL,
    "receiptUrl" TEXT,
    "vendorName" TEXT,
    "vendorContact" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "inspectorId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ROUTINE',
    "scheduledDate" TIMESTAMP(6) NOT NULL,
    "completedDate" TIMESTAMP(6),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "stripeInvoiceId" TEXT NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "amountDue" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL,
    "invoiceDate" TIMESTAMPTZ(6) NOT NULL,
    "dueDate" TIMESTAMPTZ(6),
    "paidAt" TIMESTAMPTZ(6),
    "invoiceUrl" TEXT,
    "invoicePdf" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLeadCapture" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "invoiceId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "company" TEXT,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailOpened" BOOLEAN NOT NULL DEFAULT false,
    "linkClicked" BOOLEAN NOT NULL DEFAULT false,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLeadCapture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "unitId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rentAmount" DOUBLE PRECISION NOT NULL,
    "securityDeposit" DOUBLE PRECISION NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseGeneratorUsage" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "usageCount" INTEGER DEFAULT 0,
    "paymentStatus" TEXT DEFAULT 'unpaid',
    "stripeSessionId" TEXT,
    "stripeCustomerId" TEXT,
    "amountPaid" INTEGER,
    "currency" TEXT,
    "paymentDate" TIMESTAMPTZ(6),
    "accessExpiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaseGeneratorUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRequest" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
    "preferredDate" TIMESTAMP(6),
    "allowEntry" BOOLEAN NOT NULL DEFAULT true,
    "contactPhone" TEXT,
    "requestedBy" TEXT,
    "notes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(6),
    "assignedTo" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,

    CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(6),
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyType" "PropertyType" NOT NULL DEFAULT 'SINGLE_FAMILY',

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "planId" TEXT,
    "billingPeriod" TEXT,
    "currentPeriodStart" TIMESTAMPTZ(6),
    "currentPeriodEnd" TIMESTAMPTZ(6),
    "trialStart" TIMESTAMPTZ(6),
    "trialEnd" TIMESTAMPTZ(6),
    "cancelAtPeriodEnd" BOOLEAN DEFAULT false,
    "canceledAt" TIMESTAMPTZ(6),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "emergencyContact" TEXT,
    "userId" TEXT,
    "invitationStatus" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitationToken" TEXT,
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "unitNumber" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL DEFAULT 1,
    "bathrooms" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "squareFeet" INTEGER,
    "rent" DOUBLE PRECISION NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'VACANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastInspectionDate" TIMESTAMP(6),

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wrappers_fdw_stats" (
    "fdw_name" TEXT NOT NULL,
    "create_times" BIGINT,
    "rows_in" BIGINT,
    "rows_out" BIGINT,
    "bytes_in" BIGINT,
    "bytes_out" BIGINT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "wrappers_fdw_stats_pkey" PRIMARY KEY ("fdw_name")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" "ActivityEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT true,
    "processingTime" INTEGER,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BlogArticleToBlogTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BlogArticleToBlogTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogArticle_slug_key" ON "BlogArticle"("slug");

-- CreateIndex
CREATE INDEX "idx_blog_article_slug" ON "BlogArticle"("slug");

-- CreateIndex
CREATE INDEX "idx_blog_article_published" ON "BlogArticle"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "idx_blog_article_category" ON "BlogArticle"("category");

-- CreateIndex
CREATE INDEX "idx_blog_article_featured" ON "BlogArticle"("featured");

-- CreateIndex
CREATE INDEX "idx_blog_article_created" ON "BlogArticle"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTag_name_key" ON "BlogTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTag_slug_key" ON "BlogTag"("slug");

-- CreateIndex
CREATE INDEX "idx_blog_tag_slug" ON "BlogTag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvoice_invoiceNumber_key" ON "CustomerInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "idx_customer_invoice_email" ON "CustomerInvoice"("emailCaptured");

-- CreateIndex
CREATE INDEX "idx_customer_invoice_status" ON "CustomerInvoice"("status");

-- CreateIndex
CREATE INDEX "idx_customer_invoice_created" ON "CustomerInvoice"("createdAt");

-- CreateIndex
CREATE INDEX "idx_customer_invoice_item_invoice" ON "CustomerInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "idx_document_lease_id" ON "Document"("leaseId");

-- CreateIndex
CREATE INDEX "idx_document_property_id" ON "Document"("propertyId");

-- CreateIndex
CREATE INDEX "idx_document_type" ON "Document"("type");

-- CreateIndex
CREATE INDEX "idx_expense_category" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "idx_expense_date" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "idx_expense_property_id" ON "Expense"("propertyId");

-- CreateIndex
CREATE INDEX "idx_inspection_property_id" ON "Inspection"("propertyId");

-- CreateIndex
CREATE INDEX "idx_inspection_scheduled_date" ON "Inspection"("scheduledDate");

-- CreateIndex
CREATE INDEX "idx_inspection_unit_id" ON "Inspection"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "idx_invoice_lead_email" ON "InvoiceLeadCapture"("email");

-- CreateIndex
CREATE INDEX "idx_invoice_lead_source" ON "InvoiceLeadCapture"("source");

-- CreateIndex
CREATE INDEX "idx_invoice_lead_created" ON "InvoiceLeadCapture"("createdAt");

-- CreateIndex
CREATE INDEX "idx_lease_dates" ON "Lease"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "idx_lease_status" ON "Lease"("status");

-- CreateIndex
CREATE INDEX "idx_lease_tenant_id" ON "Lease"("tenantId");

-- CreateIndex
CREATE INDEX "idx_lease_unit_id" ON "Lease"("unitId");

-- CreateIndex
CREATE INDEX "idx_lease_unit_status" ON "Lease"("unitId", "status");

-- CreateIndex
CREATE INDEX "LeaseGeneratorUsage_userId_idx" ON "LeaseGeneratorUsage"("userId");

-- CreateIndex
CREATE INDEX "idx_lease_generator_user_created" ON "LeaseGeneratorUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_maintenance_created" ON "MaintenanceRequest"("createdAt");

-- CreateIndex
CREATE INDEX "idx_maintenance_created_at" ON "MaintenanceRequest"("createdAt");

-- CreateIndex
CREATE INDEX "idx_maintenance_priority" ON "MaintenanceRequest"("priority");

-- CreateIndex
CREATE INDEX "idx_maintenance_status" ON "MaintenanceRequest"("status");

-- CreateIndex
CREATE INDEX "idx_maintenance_unit_id" ON "MaintenanceRequest"("unitId");

-- CreateIndex
CREATE INDEX "idx_property_owner_id" ON "Property"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_email_unique" ON "Tenant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_invitationToken_key" ON "Tenant"("invitationToken");

-- CreateIndex
CREATE INDEX "idx_tenant_invitation_status" ON "Tenant"("invitationStatus");

-- CreateIndex
CREATE INDEX "idx_tenant_invitation_token" ON "Tenant"("invitationToken");

-- CreateIndex
CREATE INDEX "idx_tenant_invited_by" ON "Tenant"("invitedBy");

-- CreateIndex
CREATE INDEX "idx_tenant_user_id" ON "Tenant"("userId");

-- CreateIndex
CREATE INDEX "idx_tenant_user_id_v2" ON "Tenant"("userId");

-- CreateIndex
CREATE INDEX "idx_unit_property_id" ON "Unit"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "unit_number_per_property_unique" ON "Unit"("unitNumber", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "idx_activity_user_id" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "idx_activity_entity_type" ON "Activity"("entityType");

-- CreateIndex
CREATE INDEX "idx_activity_entity_id" ON "Activity"("entityId");

-- CreateIndex
CREATE INDEX "idx_activity_created_at" ON "Activity"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_stripeEventId_key" ON "WebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "idx_webhook_event_stripe_id" ON "WebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "idx_webhook_event_type" ON "WebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "idx_webhook_event_processed" ON "WebhookEvent"("processed");

-- CreateIndex
CREATE INDEX "idx_webhook_event_created" ON "WebhookEvent"("createdAt");

-- CreateIndex
CREATE INDEX "_BlogArticleToBlogTag_B_index" ON "_BlogArticleToBlogTag"("B");

-- AddForeignKey
ALTER TABLE "BlogArticle" ADD CONSTRAINT "BlogArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoiceItem" ADD CONSTRAINT "CustomerInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CustomerInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "LeaseGeneratorUsage" ADD CONSTRAINT "LeaseGeneratorUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogArticleToBlogTag" ADD CONSTRAINT "_BlogArticleToBlogTag_A_fkey" FOREIGN KEY ("A") REFERENCES "BlogArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogArticleToBlogTag" ADD CONSTRAINT "_BlogArticleToBlogTag_B_fkey" FOREIGN KEY ("B") REFERENCES "BlogTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
