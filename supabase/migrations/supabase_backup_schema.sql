-- Supabase Database Schema Export
-- Generated: 2025-01-11
-- Source: tenant-flow database (bshjmbshupiibfiewpxb)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE "ActivityEntityType" AS ENUM (
  'property',
  'tenant', 
  'maintenance',
  'payment',
  'lease',
  'unit'
);

CREATE TYPE "BlogCategory" AS ENUM (
  'PROPERTY_MANAGEMENT',
  'LEGAL_COMPLIANCE',
  'FINANCIAL_MANAGEMENT',
  'PROPERTY_MAINTENANCE',
  'SOFTWARE_REVIEWS',
  'TENANT_RELATIONS',
  'MARKETING',
  'REAL_ESTATE_INVESTMENT',
  'TAX_PLANNING',
  'AUTOMATION'
);

CREATE TYPE "BlogStatus" AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
  'SCHEDULED'
);

CREATE TYPE "CustomerInvoiceStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'VIEWED',
  'PAID',
  'OVERDUE',
  'CANCELLED'
);

CREATE TYPE "DocumentType" AS ENUM (
  'LEASE',
  'INVOICE',
  'RECEIPT',
  'PROPERTY_PHOTO',
  'INSPECTION',
  'MAINTENANCE',
  'OTHER'
);

CREATE TYPE "LateFeeType" AS ENUM (
  'FIXED',
  'PERCENTAGE'
);

CREATE TYPE "LeaseStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED'
);

CREATE TYPE "PlanType" AS ENUM (
  'FREETRIAL',
  'STARTER',
  'GROWTH',
  'TENANTFLOW_MAX'
);

CREATE TYPE "Priority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'EMERGENCY'
);

CREATE TYPE "PropertyType" AS ENUM (
  'SINGLE_FAMILY',
  'MULTI_UNIT',
  'APARTMENT',
  'COMMERCIAL',
  'CONDO',
  'TOWNHOUSE',
  'OTHER'
);

CREATE TYPE "ReminderStatus" AS ENUM (
  'PENDING',
  'SENT',
  'FAILED',
  'DELIVERED',
  'OPENED'
);

CREATE TYPE "ReminderType" AS ENUM (
  'RENT_REMINDER',
  'LEASE_EXPIRATION',
  'MAINTENANCE_DUE',
  'PAYMENT_OVERDUE'
);

CREATE TYPE "RentChargeStatus" AS ENUM (
  'PENDING',
  'PAID',
  'PARTIAL',
  'OVERDUE',
  'CANCELLED'
);

CREATE TYPE "RentPaymentStatus" AS ENUM (
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'REQUIRES_ACTION'
);

CREATE TYPE "RequestStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
  'ON_HOLD'
);

CREATE TYPE "SubStatus" AS ENUM (
  'ACTIVE',
  'TRIALING',
  'PAST_DUE',
  'CANCELED',
  'UNPAID',
  'INCOMPLETE',
  'INCOMPLETE_EXPIRED'
);

CREATE TYPE "UnitStatus" AS ENUM (
  'VACANT',
  'OCCUPIED',
  'MAINTENANCE',
  'RESERVED'
);

CREATE TYPE "UserRole" AS ENUM (
  'OWNER',
  'MANAGER',
  'TENANT',
  'ADMIN'
);

-- ========================================
-- TABLE CREATION STATEMENTS
-- ========================================

CREATE TABLE "Activity" (
  "id" text NOT NULL DEFAULT gen_random_uuid(), 
  "userId" text NOT NULL, 
  "action" text NOT NULL, 
  "entityType" ActivityEntityType NOT NULL, 
  "entityId" text NOT NULL, 
  "entityName" text, 
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "BlogArticle" (
  "id" text NOT NULL DEFAULT gen_random_uuid(), 
  "title" text NOT NULL, 
  "slug" text NOT NULL, 
  "description" text NOT NULL, 
  "content" text NOT NULL, 
  "excerpt" text, 
  "authorId" text, 
  "authorName" text NOT NULL, 
  "metaTitle" text, 
  "metaDescription" text, 
  "ogImage" text, 
  "category" BlogCategory NOT NULL DEFAULT 'PROPERTY_MANAGEMENT'::"BlogCategory", 
  "status" BlogStatus NOT NULL DEFAULT 'DRAFT'::"BlogStatus", 
  "featured" boolean NOT NULL DEFAULT false, 
  "publishedAt" timestamp with time zone, 
  "viewCount" integer NOT NULL DEFAULT 0, 
  "readTime" integer, 
  "searchKeywords" text[], 
  "lastIndexed" timestamp with time zone, 
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "BlogTag" (
  "id" text NOT NULL DEFAULT gen_random_uuid(), 
  "name" text NOT NULL, 
  "slug" text NOT NULL, 
  "color" text, 
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CustomerInvoice" (
  "id" text NOT NULL DEFAULT gen_random_uuid(), 
  "invoiceNumber" text NOT NULL, 
  "status" CustomerInvoiceStatus NOT NULL DEFAULT 'DRAFT'::"CustomerInvoiceStatus", 
  "businessName" text NOT NULL, 
  "businessEmail" text NOT NULL, 
  "businessAddress" text, 
  "businessCity" text, 
  "businessState" text, 
  "businessZip" text, 
  "businessPhone" text, 
  "businessLogo" text, 
  "clientName" text NOT NULL, 
  "clientEmail" text NOT NULL, 
  "clientAddress" text, 
  "clientCity" text, 
  "clientState" text, 
  "clientZip" text, 
  "issueDate" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "dueDate" timestamp with time zone NOT NULL, 
  "subtotal" numeric NOT NULL DEFAULT 0, 
  "taxRate" numeric NOT NULL DEFAULT 0, 
  "taxAmount" numeric NOT NULL DEFAULT 0, 
  "total" numeric NOT NULL DEFAULT 0, 
  "notes" text, 
  "terms" text, 
  "emailCaptured" text, 
  "downloadCount" integer NOT NULL DEFAULT 0, 
  "isProVersion" boolean NOT NULL DEFAULT false, 
  "userAgent" text, 
  "ipAddress" text, 
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CustomerInvoiceItem" (
  "id" text NOT NULL DEFAULT gen_random_uuid(), 
  "invoiceId" text NOT NULL, 
  "description" text NOT NULL, 
  "quantity" numeric NOT NULL, 
  "unitPrice" numeric NOT NULL, 
  "total" numeric NOT NULL, 
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Core Business Tables
CREATE TABLE "Document" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text, 
  "name" text NOT NULL, 
  "filename" text, 
  "url" text NOT NULL, 
  "type" DocumentType NOT NULL, 
  "mimeType" text, 
  "size" bigint, 
  "propertyId" text, 
  "leaseId" text, 
  "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP, 
  "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP, 
  "fileSizeBytes" bigint NOT NULL DEFAULT 0
);

CREATE TABLE "Expense" (
  "id" text NOT NULL DEFAULT gen_random_uuid(), 
  "propertyId" text NOT NULL, 
  "maintenanceId" text, 
  "amount" double precision NOT NULL, 
  "category" text NOT NULL, 
  "description" text NOT NULL, 
  "date" timestamp without time zone NOT NULL, 
  "receiptUrl" text, 
  "vendorName" text, 
  "vendorContact" text, 
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Inspection" (
  "id" text NOT NULL DEFAULT gen_random_uuid(), 
  "propertyId" text NOT NULL, 
  "unitId" text, 
  "inspectorId" text NOT NULL, 
  "type" text NOT NULL DEFAULT 'ROUTINE'::text, 
  "scheduledDate" timestamp without time zone NOT NULL, 
  "completedDate" timestamp without time zone, 
  "status" text NOT NULL DEFAULT 'SCHEDULED'::text, 
  "notes" text, 
  "reportUrl" text, 
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Invoice" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text, 
  "userId" text NOT NULL, 
  "subscriptionId" text, 
  "stripeInvoiceId" text NOT NULL, 
  "amountPaid" integer NOT NULL, 
  "amountDue" integer NOT NULL, 
  "currency" text NOT NULL DEFAULT 'usd'::text, 
  "status" text NOT NULL, 
  "invoiceDate" timestamp with time zone NOT NULL, 
  "dueDate" timestamp with time zone, 
  "paidAt" timestamp with time zone, 
  "invoiceUrl" text, 
  "invoicePdf" text, 
  "description" text, 
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Lease" (
  "id" text NOT NULL DEFAULT gen_random_uuid(), 
  "unitId" text NOT NULL, 
  "tenantId" text NOT NULL, 
  "startDate" timestamp without time zone NOT NULL, 
  "endDate" timestamp without time zone NOT NULL, 
  "rentAmount" double precision NOT NULL, 
  "securityDeposit" double precision NOT NULL, 
  "terms" text, 
  "status" LeaseStatus NOT NULL DEFAULT 'DRAFT'::"LeaseStatus", 
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MaintenanceRequest" (
  "id" text NOT NULL DEFAULT gen_random_uuid(), 
  "unitId" text NOT NULL, 
  "title" text NOT NULL, 
  "description" text NOT NULL, 
  "category" text, 
  "priority" Priority NOT NULL DEFAULT 'MEDIUM'::"Priority", 
  "status" RequestStatus NOT NULL DEFAULT 'OPEN'::"RequestStatus", 
  "preferredDate" timestamp without time zone, 
  "allowEntry" boolean NOT NULL DEFAULT true, 
  "contactPhone" text, 
  "requestedBy" text, 
  "notes" text, 
  "photos" text[] DEFAULT ARRAY[]::text[], 
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "completedAt" timestamp without time zone, 
  "assignedTo" text, 
  "estimatedCost" double precision, 
  "actualCost" double precision
);

CREATE TABLE "Property" (
  "id" text NOT NULL DEFAULT gen_random_uuid(), 
  "name" text NOT NULL, 
  "address" text NOT NULL, 
  "city" text NOT NULL, 
  "state" text NOT NULL, 
  "zipCode" text NOT NULL, 
  "description" text, 
  "imageUrl" text, 
  "ownerId" text NOT NULL, 
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "propertyType" PropertyType NOT NULL DEFAULT 'SINGLE_FAMILY'::"PropertyType"
);

CREATE TABLE "Tenant" (
  "id" text NOT NULL DEFAULT gen_random_uuid(), 
  "name" text NOT NULL, 
  "email" text NOT NULL, 
  "phone" text, 
  "emergencyContact" text, 
  "avatarUrl" text, 
  "userId" text, 
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Unit" (
  "id" text NOT NULL DEFAULT gen_random_uuid(), 
  "unitNumber" text NOT NULL, 
  "propertyId" text NOT NULL, 
  "bedrooms" integer NOT NULL DEFAULT 1, 
  "bathrooms" double precision NOT NULL DEFAULT 1, 
  "squareFeet" integer, 
  "rent" double precision NOT NULL, 
  "status" UnitStatus NOT NULL DEFAULT 'VACANT'::"UnitStatus", 
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "lastInspectionDate" timestamp without time zone
);

CREATE TABLE "User" (
  "id" text NOT NULL, 
  "supabaseId" text NOT NULL, 
  "stripeCustomerId" text, 
  "email" text NOT NULL, 
  "name" text, 
  "phone" text, 
  "bio" text, 
  "avatarUrl" text, 
  "role" UserRole NOT NULL DEFAULT 'OWNER'::"UserRole", 
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);