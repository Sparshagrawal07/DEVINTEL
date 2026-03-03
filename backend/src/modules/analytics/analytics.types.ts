export interface DevScore {
  id: string;
  user_id: string;
  consistency_score: number;
  technical_depth_score: number;
  collaboration_score: number;
  skill_relevance_score: number;
  growth_velocity_score: number;
  composite_score: number;
  breakdown: Record<string, any>;
  snapshot_date: string;
  created_at: Date;
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
  recentActivity: { action: string; timestamp: Date; metadata: Record<string, any> }[];
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
  user_id: string;
  role_title: string;
  required_skills: string[];
  preferred_skills: string[];
  min_experience_years: number;
  target_companies: string[];
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCareerTargetDTO {
  role_title: string;
  required_skills: string[];
  preferred_skills?: string[];
  min_experience_years?: number;
  target_companies?: string[];
  notes?: string;
}
