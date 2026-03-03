-- ============================================================
-- Migration 002: Platform Extension
-- Additive-only, non-destructive migration
-- ============================================================

-- 1. Extend users table with onboarding tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_onboarded ON users (is_onboarded);

-- ============================================================
-- 2. EDUCATION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  degree VARCHAR(128) NOT NULL,
  institution VARCHAR(256) NOT NULL,
  field_of_study VARCHAR(256),
  start_year INTEGER NOT NULL,
  end_year INTEGER,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_education_user ON education (user_id);

-- ============================================================
-- 3. USER LINKS TABLE (external profiles)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  link_type VARCHAR(32) NOT NULL CHECK (link_type IN ('leetcode', 'linkedin', 'portfolio', 'twitter', 'github', 'blog', 'other')),
  url TEXT NOT NULL,
  label VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_user_links_user ON user_links (user_id);

-- ============================================================
-- 4. PROJECTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(256) NOT NULL,
  description TEXT,
  tech_stack TEXT[] DEFAULT '{}',
  url TEXT,
  github_url TEXT,
  image_url TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  highlights TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_sort ON projects (user_id, sort_order);

-- ============================================================
-- 5. GENERATED RESUMES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template VARCHAR(32) DEFAULT 'minimal',
  markdown_content TEXT NOT NULL,
  included_sections JSONB DEFAULT '{}',
  data_snapshot JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_resumes_user ON generated_resumes (user_id);

-- ============================================================
-- Apply updated_at triggers for new tables
-- ============================================================
CREATE TRIGGER update_education_modtime BEFORE UPDATE ON education FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_user_links_modtime BEFORE UPDATE ON user_links FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_generated_resumes_modtime BEFORE UPDATE ON generated_resumes FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
