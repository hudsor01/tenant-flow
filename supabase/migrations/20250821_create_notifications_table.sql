-- Create notifications table for managing user notifications
-- This table stores in-app notifications for maintenance requests and other system events

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')),
    action_url TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to notifications table
DROP TRIGGER IF EXISTS handle_notifications_updated_at ON public.notifications;
CREATE TRIGGER handle_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (recipient_id = auth.uid());

-- Users can only update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (recipient_id = auth.uid());

-- Only authenticated users with proper roles can insert notifications
-- This is typically done by the backend service, not by frontend users
CREATE POLICY "Service can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        -- Allow service role or admin users to create notifications
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM "User" 
            WHERE id = auth.uid() 
            AND role IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Only admin users can delete notifications
CREATE POLICY "Admins can delete notifications" ON public.notifications
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "User" 
            WHERE id = auth.uid() 
            AND role IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;

-- Add helpful comments
COMMENT ON TABLE public.notifications IS 'Stores user notifications for maintenance requests, system alerts, and other events';
COMMENT ON COLUMN public.notifications.recipient_id IS 'References the user who should receive this notification';
COMMENT ON COLUMN public.notifications.type IS 'Notification type (e.g., maintenance_request_created, lease_expiring)';
COMMENT ON COLUMN public.notifications.priority IS 'Priority level affecting notification urgency and delivery method';
COMMENT ON COLUMN public.notifications.action_url IS 'Optional URL for notification action (e.g., view maintenance request)';
COMMENT ON COLUMN public.notifications.data IS 'Additional JSON data specific to notification type';