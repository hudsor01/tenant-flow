CREATE TABLE blogs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    meta_description TEXT,
    featured_image TEXT,
    category TEXT,
    tags TEXT[],
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published',
  'archived')),
    word_count INTEGER,
    reading_time INTEGER GENERATED ALWAYS AS (GREATEST(1, word_count / 200))
  STORED,
    quality_score NUMERIC(3,2),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index for slug lookups (your Next.js routes)
  CREATE INDEX idx_blogs_slug ON blogs(slug);

  -- Index for filtering by status
  CREATE INDEX idx_blogs_status ON blogs(status);

  -- Index for category filtering
  CREATE INDEX idx_blogs_category ON blogs(category);

  -- Auto-update updated_at timestamp
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ language 'plpgsql';

  CREATE TRIGGER update_blogs_updated_at
    BEFORE UPDATE ON blogs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();