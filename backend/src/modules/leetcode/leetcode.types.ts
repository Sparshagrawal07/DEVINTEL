export interface LeetCodeProfile {
  id: string;
  user_id: string;
  leetcode_username: string;
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  acceptance_rate: number;
  ranking: number;
  contribution_points: number;
  reputation: number;
  total_submissions: number;
  recent_submissions: LeetCodeSubmission[];
  skills_tags: string[];
  contest_rating: number | null;
  contests_attended: number;
  badge_count: number;
  streak: number;
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface LeetCodeSubmission {
  id: string;
  user_id: string;
  leetcode_profile_id: string;
  title: string;
  title_slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: string;
  language: string;
  runtime: string | null;
  memory: string | null;
  timestamp: number;
  submitted_at: Date;
  created_at: Date;
}

export interface LeetCodeCalendarEntry {
  date: string;
  count: number;
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
  recentSubmissions: LeetCodeSubmission[];
  submissionCalendar: LeetCodeCalendarEntry[];
  skillTags: string[];
}

export interface ConnectLeetCodeDTO {
  username: string;
}

// LeetCode GraphQL API response types
export interface LCUserProfile {
  username: string;
  ranking: number;
  reputation: number;
  contributionPoints: number;
  starRating: number;
}

export interface LCMatchedUser {
  username: string;
  profile: LCUserProfile;
  submitStatsGlobal: {
    acSubmissionNum: { difficulty: string; count: number; submissions: number }[];
  };
  submissionCalendar: string;
  badges: { id: string }[];
  userCalendar: {
    streak: number;
    totalActiveDays: number;
    activeYears: number[];
  };
}

export interface LCContestInfo {
  userContestRanking: {
    rating: number;
    attendedContestsCount: number;
  } | null;
}

export interface LCRecentSubmission {
  title: string;
  titleSlug: string;
  statusDisplay: string;
  lang: string;
  runtime: string;
  memory: string;
  timestamp: string;
}
