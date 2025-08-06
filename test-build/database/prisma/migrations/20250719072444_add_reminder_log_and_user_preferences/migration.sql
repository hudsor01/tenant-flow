-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('RENT_REMINDER', 'LEASE_EXPIRATION', 'MAINTENANCE_DUE', 'PAYMENT_OVERDUE');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED', 'OPENED');

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "leaseId" TEXT,
    "userId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT,
    "content" TEXT,
    "sentAt" TIMESTAMPTZ(6),
    "deliveredAt" TIMESTAMPTZ(6),
    "openedAt" TIMESTAMPTZ(6),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "enableReminders" BOOLEAN NOT NULL DEFAULT true,
    "daysBeforeDue" INTEGER NOT NULL DEFAULT 3,
    "enableOverdueReminders" BOOLEAN NOT NULL DEFAULT true,
    "overdueGracePeriod" INTEGER NOT NULL DEFAULT 5,
    "autoSendReminders" BOOLEAN NOT NULL DEFAULT false,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "defaultDashboardView" TEXT NOT NULL DEFAULT 'overview',
    "showWelcomeMessage" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_reminder_log_user_id" ON "ReminderLog"("userId");

-- CreateIndex
CREATE INDEX "idx_reminder_log_lease_id" ON "ReminderLog"("leaseId");

-- CreateIndex
CREATE INDEX "idx_reminder_log_type" ON "ReminderLog"("type");

-- CreateIndex
CREATE INDEX "idx_reminder_log_status" ON "ReminderLog"("status");

-- CreateIndex
CREATE INDEX "idx_reminder_log_sent_at" ON "ReminderLog"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "idx_user_preferences_user_id" ON "UserPreferences"("userId");

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
