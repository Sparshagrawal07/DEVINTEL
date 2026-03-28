export interface Repository {
  id: string;
  user_id: string;
  github_id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string | null;
  language: string | null;
  languages_breakdown: Record<string, number>;
  stars_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  is_fork: boolean;
  is_private: boolean;
  is_archived: boolean;
  size_kb: number;
  default_branch: string;
  topics: string[];
  last_synced_at: Date | null;
  repo_created_at: Date | null;
  repo_updated_at: Date | null;
  repo_pushed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Commit {
  id: string;
  repository_id: string;
  user_id: string;
  sha: string;
  message: string;
  author_name: string | null;
  author_email: string | null;
  additions: number;
  deletions: number;
  changed_files: number;
  committed_at: Date;
  created_at: Date;
}

export interface PullRequest {
  id: string;
  repository_id: string;
  user_id: string;
  github_pr_id: number;
  number: number;
  title: string;
  state: string;
  is_merged: boolean;
  additions: number;
  deletions: number;
  changed_files: number;
  comments_count: number;
  review_comments_count: number;
  pr_created_at: Date | null;
  pr_closed_at: Date | null;
  pr_merged_at: Date | null;
  created_at: Date;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  clone_url: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  fork: boolean;
  private: boolean;
  archived: boolean;
  size: number;
  default_branch: string;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubCommit {
  sha: string;
  author?: {
    id: number;
    login: string;
  } | null;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: { filename: string }[];
}

export interface GitHubPR {
  id: number;
  user?: {
    id: number;
    login: string;
  };
  number: number;
  title: string;
  state: string;
  merged: boolean;
  additions: number;
  deletions: number;
  changed_files: number;
  comments: number;
  review_comments: number;
  created_at: string;
  closed_at: string | null;
  merged_at: string | null;
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
