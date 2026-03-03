-- DevIntel Database Schema
-- Full SQL schema with proper indexing, foreign keys, and cascading rules

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(320) UNIQUE NOT NULL,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  display_name VARCHAR(128),
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(128),
  is_active BOOLEAN DEFAULT TRUE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_created_at ON users (created_at);

-- ============================================================
-- OAUTH ACCOUNTS TABLE
-- ============================================================
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(32) NOT NULL,
  provider_user_id VARCHAR(128) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  provider_username VARCHAR(128),
  provider_email VARCHAR(320),
  provider_avatar_url TEXT,
  raw_profile JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_user ON oauth_accounts (user_id);
CREATE INDEX idx_oauth_provider ON oauth_accounts (provider, provider_user_id);

-- ============================================================
-- REFRESH TOKENS TABLE
-- ============================================================
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  device_info VARCHAR(512),
  ip_address INET,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);

-- ============================================================
-- REPOSITORIES TABLE
-- ============================================================
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_id BIGINT NOT NULL,
  name VARCHAR(256) NOT NULL,
  full_name VARCHAR(512) NOT NULL,
  description TEXT,
  html_url TEXT NOT NULL,
  clone_url TEXT,
  language VARCHAR(64),
  languages_breakdown JSONB DEFAULT '{}',
  stars_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  watchers_count INTEGER DEFAULT 0,
  open_issues_count INTEGER DEFAULT 0,
  is_fork BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  size_kb INTEGER DEFAULT 0,
  default_branch VARCHAR(128) DEFAULT 'main',
  topics TEXT[] DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  repo_created_at TIMESTAMPTZ,
  repo_updated_at TIMESTAMPTZ,
  repo_pushed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, github_id)
);

CREATE INDEX idx_repos_user ON repositories (user_id);
CREATE INDEX idx_repos_github ON repositories (github_id);
CREATE INDEX idx_repos_language ON repositories (language);
CREATE INDEX idx_repos_synced ON repositories (last_synced_at);

-- ============================================================
-- COMMITS TABLE
-- ============================================================
CREATE TABLE commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sha VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  author_name VARCHAR(128),
  author_email VARCHAR(320),
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  changed_files INTEGER DEFAULT 0,
  committed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, sha)
);

CREATE INDEX idx_commits_repo ON commits (repository_id);
CREATE INDEX idx_commits_user ON commits (user_id);
CREATE INDEX idx_commits_date ON commits (committed_at);
CREATE INDEX idx_commits_sha ON commits (sha);

-- ============================================================
-- PULL REQUESTS TABLE
-- ============================================================
CREATE TABLE pull_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_pr_id BIGINT NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  state VARCHAR(16) NOT NULL,
  is_merged BOOLEAN DEFAULT FALSE,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  changed_files INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  review_comments_count INTEGER DEFAULT 0,
  pr_created_at TIMESTAMPTZ,
  pr_closed_at TIMESTAMPTZ,
  pr_merged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, github_pr_id)
);

CREATE INDEX idx_prs_repo ON pull_requests (repository_id);
CREATE INDEX idx_prs_user ON pull_requests (user_id);
CREATE INDEX idx_prs_state ON pull_requests (state);

-- ============================================================
-- SKILLS TABLE
-- ============================================================
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  category VARCHAR(64) NOT NULL,
  source VARCHAR(32) NOT NULL CHECK (source IN ('github', 'resume', 'manual')),
  proficiency_level INTEGER DEFAULT 0 CHECK (proficiency_level >= 0 AND proficiency_level <= 100),
  evidence JSONB DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name, source)
);

CREATE INDEX idx_skills_user ON skills (user_id);
CREATE INDEX idx_skills_category ON skills (category);
CREATE INDEX idx_skills_name ON skills (name);

-- ============================================================
-- RESUME ANALYSES TABLE
-- ============================================================
CREATE TABLE resume_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(256) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  extracted_text TEXT,
  parsed_skills TEXT[] DEFAULT '{}',
  parsed_experience JSONB DEFAULT '[]',
  parsed_education JSONB DEFAULT '[]',
  target_role VARCHAR(128),
  skill_match_score NUMERIC(5,2) DEFAULT 0,
  experience_score NUMERIC(5,2) DEFAULT 0,
  education_score NUMERIC(5,2) DEFAULT 0,
  overall_score NUMERIC(5,2) DEFAULT 0,
  recommendations JSONB DEFAULT '[]',
  processing_status VARCHAR(32) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resume_user ON resume_analyses (user_id);
CREATE INDEX idx_resume_status ON resume_analyses (processing_status);

-- ============================================================
-- DEV SCORES TABLE
-- ============================================================
CREATE TABLE dev_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consistency_score NUMERIC(5,2) DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 100),
  technical_depth_score NUMERIC(5,2) DEFAULT 0 CHECK (technical_depth_score >= 0 AND technical_depth_score <= 100),
  collaboration_score NUMERIC(5,2) DEFAULT 0 CHECK (collaboration_score >= 0 AND collaboration_score <= 100),
  skill_relevance_score NUMERIC(5,2) DEFAULT 0 CHECK (skill_relevance_score >= 0 AND skill_relevance_score <= 100),
  growth_velocity_score NUMERIC(5,2) DEFAULT 0 CHECK (growth_velocity_score >= 0 AND growth_velocity_score <= 100),
  composite_score NUMERIC(5,2) DEFAULT 0 CHECK (composite_score >= 0 AND composite_score <= 100),
  breakdown JSONB DEFAULT '{}',
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_dev_scores_user ON dev_scores (user_id);
CREATE INDEX idx_dev_scores_date ON dev_scores (snapshot_date DESC);
CREATE INDEX idx_dev_scores_composite ON dev_scores (composite_score DESC);

-- ============================================================
-- CAREER TARGETS TABLE
-- ============================================================
CREATE TABLE career_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_title VARCHAR(128) NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  preferred_skills TEXT[] DEFAULT '{}',
  min_experience_years INTEGER DEFAULT 0,
  target_companies TEXT[] DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_career_targets_user ON career_targets (user_id);

-- ============================================================
-- LEETCODE PROFILES TABLE
-- ============================================================
CREATE TABLE leetcode_profiles (
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

CREATE INDEX idx_leetcode_profiles_user ON leetcode_profiles (user_id);
CREATE INDEX idx_leetcode_profiles_username ON leetcode_profiles (leetcode_username);

-- ============================================================
-- LEETCODE SUBMISSIONS TABLE
-- ============================================================
CREATE TABLE leetcode_submissions (
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

CREATE INDEX idx_leetcode_subs_user ON leetcode_submissions (user_id);
CREATE INDEX idx_leetcode_subs_profile ON leetcode_submissions (leetcode_profile_id);
CREATE INDEX idx_leetcode_subs_date ON leetcode_submissions (submitted_at);
CREATE INDEX idx_leetcode_subs_difficulty ON leetcode_submissions (difficulty);

-- ============================================================
-- ACTIVITY LOGS TABLE
-- ============================================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64),
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_logs (user_id);
CREATE INDEX idx_activity_action ON activity_logs (action);
CREATE INDEX idx_activity_created ON activity_logs (created_at DESC);

-- ============================================================
-- JOB LOGS TABLE
-- ============================================================
CREATE TABLE job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(128) NOT NULL,
  job_id VARCHAR(256) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('queued', 'active', 'completed', 'failed', 'retrying')),
  attempt INTEGER DEFAULT 1,
  payload JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_logs_name ON job_logs (job_name);
CREATE INDEX idx_job_logs_status ON job_logs (status);
CREATE INDEX idx_job_logs_user ON job_logs (user_id);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_oauth_modtime BEFORE UPDATE ON oauth_accounts FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_repos_modtime BEFORE UPDATE ON repositories FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_skills_modtime BEFORE UPDATE ON skills FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_resume_modtime BEFORE UPDATE ON resume_analyses FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_career_modtime BEFORE UPDATE ON career_targets FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_leetcode_profiles_modtime BEFORE UPDATE ON leetcode_profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
