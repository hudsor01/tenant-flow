-- Create GeneratedReport table for report library
CREATE TABLE IF NOT EXISTS "GeneratedReport" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "reportType" TEXT NOT NULL CHECK ("reportType" IN (
        'executive-monthly',
        'financial-performance',
        'property-portfolio',
        'lease-portfolio',
        'maintenance-operations',
        'tax-preparation'
    )),
    "reportName" TEXT NOT NULL,
    "format" TEXT NOT NULL CHECK ("format" IN ('pdf', 'excel')),
    "status" TEXT NOT NULL DEFAULT 'completed' CHECK ("status" IN ('generating', 'completed', 'failed')),
    "fileUrl" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ScheduledReport table for scheduled reports
CREATE TABLE IF NOT EXISTS "ScheduledReport" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "reportType" TEXT NOT NULL CHECK ("reportType" IN (
        'executive-monthly',
        'financial-performance',
        'property-portfolio',
        'lease-portfolio',
        'maintenance-operations',
        'tax-preparation'
    )),
    "reportName" TEXT NOT NULL,
    "format" TEXT NOT NULL CHECK ("format" IN ('pdf', 'excel')),
    "frequency" TEXT NOT NULL CHECK ("frequency" IN ('daily', 'weekly', 'monthly')),
    "dayOfWeek" INTEGER CHECK ("dayOfWeek" BETWEEN 0 AND 6),
    "dayOfMonth" INTEGER CHECK ("dayOfMonth" BETWEEN 1 AND 31),
    "hour" INTEGER NOT NULL DEFAULT 9 CHECK ("hour" BETWEEN 0 AND 23),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMPTZ,
    "nextRunAt" TIMESTAMPTZ,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "GeneratedReport_userId_createdAt_idx" 
    ON "GeneratedReport" ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "GeneratedReport_status_idx" 
    ON "GeneratedReport" ("status");

CREATE INDEX IF NOT EXISTS "ScheduledReport_userId_isActive_idx" 
    ON "ScheduledReport" ("userId", "isActive");

CREATE INDEX IF NOT EXISTS "ScheduledReport_nextRunAt_isActive_idx" 
    ON "ScheduledReport" ("nextRunAt", "isActive") WHERE "isActive" = true;

-- Enable RLS
ALTER TABLE "GeneratedReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduledReport" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for GeneratedReport
CREATE POLICY "Users can view their own generated reports"
    ON "GeneratedReport"
    FOR SELECT
    USING (auth.uid() = "userId");

CREATE POLICY "Users can insert their own generated reports"
    ON "GeneratedReport"
    FOR INSERT
    WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own generated reports"
    ON "GeneratedReport"
    FOR UPDATE
    USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own generated reports"
    ON "GeneratedReport"
    FOR DELETE
    USING (auth.uid() = "userId");

-- RLS Policies for ScheduledReport
CREATE POLICY "Users can view their own scheduled reports"
    ON "ScheduledReport"
    FOR SELECT
    USING (auth.uid() = "userId");

CREATE POLICY "Users can insert their own scheduled reports"
    ON "ScheduledReport"
    FOR INSERT
    WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own scheduled reports"
    ON "ScheduledReport"
    FOR UPDATE
    USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own scheduled reports"
    ON "ScheduledReport"
    FOR DELETE
    USING (auth.uid() = "userId");

-- Create trigger function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updatedAt
CREATE TRIGGER update_generated_report_updated_at
    BEFORE UPDATE ON "GeneratedReport"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_report_updated_at
    BEFORE UPDATE ON "ScheduledReport"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
