-- Create FAQ tables
CREATE TABLE faq_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE faq_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_faq_categories_display_order ON faq_categories(display_order);
CREATE INDEX idx_faq_categories_active ON faq_categories(is_active);
CREATE INDEX idx_faq_questions_category_id ON faq_questions(category_id);
CREATE INDEX idx_faq_questions_display_order ON faq_questions(display_order);
CREATE INDEX idx_faq_questions_active ON faq_questions(is_active);

-- RLS policies (if using Supabase)
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_questions ENABLE ROW LEVEL SECURITY;

-- Public read access for FAQ content
CREATE POLICY "Public read access for faq_categories" ON faq_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public read access for faq_questions" ON faq_questions
    FOR SELECT USING (is_active = true);

-- Admin write access (adjust based on your auth system)
CREATE POLICY "Admin write access for faq_categories" ON faq_categories
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin write access for faq_questions" ON faq_questions
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');