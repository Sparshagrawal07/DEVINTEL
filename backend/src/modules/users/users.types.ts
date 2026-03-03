export interface UserProfile {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface UpdateProfileDTO {
  display_name?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
}

export interface UserStats {
  total_repos: number;
  total_commits: number;
  total_prs: number;
  total_skills: number;
  latest_dev_score: number | null;
  member_since: Date;
  leetcode_solved: number | null;
  leetcode_username: string | null;
}
