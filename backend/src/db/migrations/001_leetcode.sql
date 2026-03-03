-- LeetCode Integration Migration
-- Run this after the base schema.sql

-- ============================================================
-- LEETCODE PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS leetcode_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  leetcode_username VARCHAR(64) NOT NULL,
  total_solved INTEGER DEFAULT 0,
  easy_solved INTEGER DEFAULT 0,
  medium_solved INTEGER DEFAULT 0,
  hard_solved INTEGER DEFAULT 0,
  acceptance_rate NUMERIC(5,2) DEFAULT 0,
  ranking INTEGER DEFAULT 0,
  contribution_points INTEGER DEFAULT 0,
  reputation INTEGER DEFAULT 0,
  total_submissions INTEGER DEFAULT 0,
  skills_tags TEXT[] DEFAULT '{}',
  contest_rating INTEGER,
  contests_attended INTEGER DEFAULT 0,
  badge_count INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leetcode_profiles_user ON leetcode_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_leetcode_profiles_username ON leetcode_profiles (leetcode_username);

-- ============================================================
-- LEETCODE SUBMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS leetcode_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leetcode_profile_id UUID NOT NULL REFERENCES leetcode_profiles(id) ON DELETE CASCADE,
  title VARCHAR(256) NOT NULL,
  title_slug VARCHAR(256) NOT NULL,
  difficulty VARCHAR(16) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  status VARCHAR(64) NOT NULL,
  language VARCHAR(32) NOT NULL,
  runtime VARCHAR(64),
  memory VARCHAR(64),
  timestamp BIGINT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(leetcode_profile_id, title_slug, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_leetcode_subs_user ON leetcode_submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_leetcode_subs_profile ON leetcode_submissions (leetcode_profile_id);
CREATE INDEX IF NOT EXISTS idx_leetcode_subs_date ON leetcode_submissions (submitted_at);
CREATE INDEX IF NOT EXISTS idx_leetcode_subs_difficulty ON leetcode_submissions (difficulty);

-- Apply updated_at trigger
CREATE TRIGGER update_leetcode_profiles_modtime BEFORE UPDATE ON leetcode_profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
