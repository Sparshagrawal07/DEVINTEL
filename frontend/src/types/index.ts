// ============================================================
// API Types
// ============================================================

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================
// Auth Types
// ============================================================

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================================
// GitHub Types
// ============================================================

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  languages_breakdown: Record<string, number>;
  stars_count: number;
  forks_count: number;
  is_fork: boolean;
  is_private: boolean;
  topics: string[];
  last_synced_at: string | null;
  repo_pushed_at: string | null;
}

export interface IntelligenceMetrics {
  consistencyScore: number;
  technicalBreadthScore: number;
  growthVelocityScore: number;
  collaborationScore: number;
  languageDistribution: LanguageDistribution[];
  commitFrequency: CommitFrequency[];
  totalCommits: number;
  totalPRs: number;
  mergedPRs: number;
  activeDays: number;
  streakDays: number;
}

export interface LanguageDistribution {
  language: string;
  bytes: number;
  percentage: number;
}

export interface CommitFrequency {
  date: string;
  count: number;
}

// ============================================================
// Resume Types
// ============================================================

export interface ResumeAnalysis {
  id: string;
  file_name: string;
  target_role: string | null;
  parsed_skills: string[];
  skill_match_score: number;
  experience_score: number;
  education_score: number;
  overall_score: number;
  recommendations: string[];
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

// ============================================================
// Analytics Types
// ============================================================

export interface DevScore {
  id: string;
  consistency_score: number;
  technical_depth_score: number;
  collaboration_score: number;
  skill_relevance_score: number;
  growth_velocity_score: number;
  composite_score: number;
  breakdown: Record<string, any>;
  snapshot_date: string;
}

export interface ScoreTrend {
  date: string;
  composite_score: number;
  consistency_score: number;
  technical_depth_score: number;
  collaboration_score: number;
  skill_relevance_score: number;
  growth_velocity_score: number;
}

export interface SkillGap {
  skill: string;
  category: string;
  current_level: number;
  required_level: number;
  gap: number;
}

export interface DashboardData {
  currentScore: DevScore | null;
  scoreTrend: ScoreTrend[];
  skillGaps: SkillGap[];
  activityHeatmap: { date: string; count: number }[];
  topLanguages: { language: string; percentage: number }[];
  recentActivity: { action: string; timestamp: string; metadata: Record<string, any> }[];
  leetcode: {
    connected: boolean;
    username: string | null;
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    acceptanceRate: number;
    ranking: number;
    contestRating: number | null;
    contestsAttended: number;
    streak: number;
    submissionCalendar: { date: string; count: number }[];
  } | null;
}

export interface CareerTarget {
  id: string;
  role_title: string;
  required_skills: string[];
  preferred_skills: string[];
  min_experience_years: number;
  target_companies: string[];
  notes: string | null;
  is_active: boolean;
}

export interface UserStats {
  total_repos: number;
  total_commits: number;
  total_prs: number;
  total_skills: number;
  latest_dev_score: number | null;
  member_since: string;
  leetcode_solved: number | null;
  leetcode_username: string | null;
}

// ============================================================
// LeetCode Types
// ============================================================

export interface LeetCodeProfile {
  id: string;
  leetcode_username: string;
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  acceptance_rate: number;
  ranking: number;
  contest_rating: number | null;
  contests_attended: number;
  streak: number;
  badge_count: number;
  last_synced_at: string | null;
}

export interface LeetCodeStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate: number;
  ranking: number;
  contestRating: number | null;
  contestsAttended: number;
  streak: number;
  totalSubmissions: number;
  submissionCalendar: { date: string; count: number }[];
  skillTags: string[];
}
