-- RPC functions for FAQ analytics

-- Function to increment view count (atomic operation)
CREATE OR REPLACE FUNCTION increment_faq_view_count(question_id UUID)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
    UPDATE faq_questions
    SET view_count = view_count + 1,
        updated_at = NOW()
    WHERE id = question_id AND is_active = true;
$$;

-- Function to increment helpful count (atomic operation)
CREATE OR REPLACE FUNCTION increment_faq_helpful_count(question_id UUID)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
    UPDATE faq_questions
    SET helpful_count = helpful_count + 1,
        updated_at = NOW()
    WHERE id = question_id AND is_active = true;
$$;

-- Function to get FAQ stats for admin dashboard (optimized with single scan)
CREATE OR REPLACE FUNCTION get_faq_analytics()
RETURNS TABLE (
    total_categories BIGINT,
    total_questions BIGINT,
    total_views BIGINT,
    total_helpful BIGINT,
    avg_helpful_rate DECIMAL
)
LANGUAGE sql
SECURITY INVOKER
AS $$
    WITH question_stats AS (
        SELECT
            COUNT(*) as question_count,
            COALESCE(SUM(view_count), 0) as total_view_count,
            COALESCE(SUM(helpful_count), 0) as total_helpful_count
        FROM faq_questions
        WHERE is_active = true
    )
    SELECT
        (SELECT COUNT(*) FROM faq_categories WHERE is_active = true) as total_categories,
        qs.question_count::BIGINT as total_questions,
        qs.total_view_count::BIGINT as total_views,
        qs.total_helpful_count::BIGINT as total_helpful,
        CASE
            WHEN qs.total_view_count > 0
            THEN ROUND((qs.total_helpful_count::DECIMAL / qs.total_view_count::DECIMAL) * 100, 2)
            ELSE 0
        END as avg_helpful_rate
    FROM question_stats qs;
$$;
