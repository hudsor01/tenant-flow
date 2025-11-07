-- RPC functions for FAQ analytics

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_faq_view_count(question_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE faq_questions
    SET view_count = view_count + 1,
        updated_at = NOW()
    WHERE id = question_id AND is_active = true;
END;
$$;

-- Function to increment helpful count
CREATE OR REPLACE FUNCTION increment_faq_helpful_count(question_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE faq_questions
    SET helpful_count = helpful_count + 1,
        updated_at = NOW()
    WHERE id = question_id AND is_active = true;
END;
$$;

-- Function to get FAQ stats for admin dashboard
CREATE OR REPLACE FUNCTION get_faq_analytics()
RETURNS TABLE (
    total_categories BIGINT,
    total_questions BIGINT,
    total_views BIGINT,
    total_helpful BIGINT,
    avg_helpful_rate DECIMAL
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM faq_categories WHERE is_active = true) as total_categories,
        (SELECT COUNT(*) FROM faq_questions WHERE is_active = true) as total_questions,
        (SELECT COALESCE(SUM(view_count), 0) FROM faq_questions WHERE is_active = true) as total_views,
        (SELECT COALESCE(SUM(helpful_count), 0) FROM faq_questions WHERE is_active = true) as total_helpful,
        CASE
            WHEN (SELECT COALESCE(SUM(view_count), 0) FROM faq_questions WHERE is_active = true) > 0
            THEN ROUND(
                ((SELECT COALESCE(SUM(helpful_count), 0) FROM faq_questions WHERE is_active = true)::DECIMAL /
                 (SELECT COALESCE(SUM(view_count), 0) FROM faq_questions WHERE is_active = true)::DECIMAL) * 100,
                2
            )
            ELSE 0
        END as avg_helpful_rate;
END;
$$;
