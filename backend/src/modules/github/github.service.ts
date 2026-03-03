import { GitHubRepository } from './github.repository';
import { query, queryOne } from '../../config/database';
import {
  GitHubRepo,
  GitHubCommit,
  GitHubPR,
  IntelligenceMetrics,
  LanguageDistribution,
} from './github.types';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { logger } from '../../config/logger';

export class GitHubService {
  constructor(private readonly ghRepo: GitHubRepository) {}

  async getAccessToken(userId: string): Promise<string> {
    const oauth = await queryOne<{ access_token: string }>(
      'SELECT access_token FROM oauth_accounts WHERE user_id = $1 AND provider = $2',
      [userId, 'github']
    );
    if (!oauth) throw new BadRequestError('GitHub account not connected');
    return oauth.access_token;
  }

  async getGitHubUsername(userId: string): Promise<string | null> {
    const oauth = await queryOne<{ provider_username: string }>(
      'SELECT provider_username FROM oauth_accounts WHERE user_id = $1 AND provider = $2',
      [userId, 'github']
    );
    return oauth?.provider_username ?? null;
  }

  async syncRepositories(userId: string): Promise<{ synced: number }> {
    const accessToken = await this.getAccessToken(userId);
    const repos = await this.fetchAllRepos(accessToken);

    let synced = 0;

    for (const repo of repos) {
      try {
        // Fetch languages breakdown
        const languages = await this.fetchRepoLanguages(accessToken, repo.full_name);

        await this.ghRepo.upsertRepo({
          user_id: userId,
          github_id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          html_url: repo.html_url,
          clone_url: repo.clone_url,
          language: repo.language,
          languages_breakdown: languages,
          stars_count: repo.stargazers_count,
          forks_count: repo.forks_count,
          watchers_count: repo.watchers_count,
          open_issues_count: repo.open_issues_count,
          is_fork: repo.fork,
          is_private: repo.private,
          is_archived: repo.archived,
          size_kb: repo.size,
          default_branch: repo.default_branch,
          topics: repo.topics || [],
          last_synced_at: new Date(),
          repo_created_at: new Date(repo.created_at),
          repo_updated_at: new Date(repo.updated_at),
          repo_pushed_at: repo.pushed_at ? new Date(repo.pushed_at) : null,
        });
        synced++;
      } catch (error) {
        logger.error(`Failed to sync repo ${repo.full_name}:`, error);
      }
    }

    return { synced };
  }

  async syncCommits(userId: string, repoId?: string): Promise<{ synced: number }> {
    const accessToken = await this.getAccessToken(userId);
    const githubUsername = await this.getGitHubUsername(userId);

    let repos;
    if (repoId) {
      const repo = await this.ghRepo.findRepoById(repoId);
      if (!repo) throw new NotFoundError('Repository');
      repos = [repo];
    } else {
      repos = await this.ghRepo.findReposByUser(userId);
    }

    let synced = 0;

    for (const repo of repos) {
      try {
        const commits = await this.fetchCommits(accessToken, repo.full_name, githubUsername || undefined);

        for (const commit of commits) {
          await this.ghRepo.upsertCommit({
            repository_id: repo.id,
            user_id: userId,
            sha: commit.sha,
            message: commit.commit.message.substring(0, 2000),
            author_name: commit.commit.author.name,
            author_email: commit.commit.author.email,
            additions: commit.stats?.additions ?? 0,
            deletions: commit.stats?.deletions ?? 0,
            changed_files: commit.files?.length ?? 0,
            committed_at: new Date(commit.commit.author.date),
          });
          synced++;
        }
      } catch (error) {
        logger.error(`Failed to sync commits for ${repo.full_name}:`, error);
      }
    }

    return { synced };
  }

  async syncPullRequests(userId: string): Promise<{ synced: number }> {
    const accessToken = await this.getAccessToken(userId);
    const repos = await this.ghRepo.findReposByUser(userId);

    let synced = 0;

    for (const repo of repos) {
      try {
        const prs = await this.fetchPullRequests(accessToken, repo.full_name);

        for (const pr of prs) {
          await this.ghRepo.upsertPR({
            repository_id: repo.id,
            user_id: userId,
            github_pr_id: pr.id,
            number: pr.number,
            title: pr.title,
            state: pr.state,
            is_merged: pr.merged ?? false,
            additions: pr.additions ?? 0,
            deletions: pr.deletions ?? 0,
            changed_files: pr.changed_files ?? 0,
            comments_count: pr.comments ?? 0,
            review_comments_count: pr.review_comments ?? 0,
            pr_created_at: pr.created_at ? new Date(pr.created_at) : null,
            pr_closed_at: pr.closed_at ? new Date(pr.closed_at) : null,
            pr_merged_at: pr.merged_at ? new Date(pr.merged_at) : null,
          });
          synced++;
        }
      } catch (error) {
        logger.error(`Failed to sync PRs for ${repo.full_name}:`, error);
      }
    }

    return { synced };
  }

  async getRepositories(userId: string) {
    return this.ghRepo.findReposByUser(userId);
  }

  async computeIntelligenceMetrics(userId: string): Promise<IntelligenceMetrics> {
    const [commitFrequency, streak, activeDays, prStats, langDistRaw] = await Promise.all([
      this.ghRepo.getCommitFrequency(userId, 365),
      this.ghRepo.getCommitStreak(userId),
      this.ghRepo.getActiveDaysCount(userId, 365),
      this.ghRepo.getPRStats(userId),
      this.ghRepo.getLanguageDistribution(userId),
    ]);

    const totalCommits = commitFrequency.reduce((sum, d) => sum + d.count, 0);

    // Language distribution with percentages
    const totalBytes = langDistRaw.reduce((sum, l) => sum + Number(l.total_bytes), 0);
    const languageDistribution: LanguageDistribution[] = langDistRaw.map((l) => ({
      language: l.language,
      bytes: Number(l.total_bytes),
      percentage: totalBytes > 0 ? Math.round((Number(l.total_bytes) / totalBytes) * 10000) / 100 : 0,
    }));

    // Compute scores
    const consistencyScore = this.computeConsistencyScore(activeDays, streak, totalCommits);
    const technicalBreadthScore = this.computeTechnicalBreadthScore(languageDistribution);
    const growthVelocityScore = this.computeGrowthVelocityScore(commitFrequency);
    const collaborationScore = this.computeCollaborationScore(prStats);

    return {
      consistencyScore,
      technicalBreadthScore,
      growthVelocityScore,
      collaborationScore,
      languageDistribution,
      commitFrequency,
      totalCommits,
      totalPRs: prStats.total,
      mergedPRs: prStats.merged,
      activeDays,
      streakDays: streak,
    };
  }

  // Scoring algorithms
  private computeConsistencyScore(activeDays: number, streak: number, totalCommits: number): number {
    // Active days ratio (max 365 days)
    const activeDaysRatio = Math.min(activeDays / 365, 1);
    // Streak bonus (max 30 days = full bonus)
    const streakBonus = Math.min(streak / 30, 1);
    // Volume baseline
    const volumeScore = Math.min(totalCommits / 500, 1);

    const score = (activeDaysRatio * 0.5 + streakBonus * 0.3 + volumeScore * 0.2) * 100;
    return Math.round(Math.min(score, 100) * 100) / 100;
  }

  private computeTechnicalBreadthScore(languages: LanguageDistribution[]): number {
    if (languages.length === 0) return 0;

    // Number of languages used (weighted)
    const languageCount = Math.min(languages.length, 10);
    const diversityScore = languageCount / 10;

    // Shannon diversity index (normalized)
    let shannonIndex = 0;
    for (const lang of languages) {
      const p = lang.percentage / 100;
      if (p > 0) {
        shannonIndex -= p * Math.log2(p);
      }
    }
    const maxShannon = Math.log2(languages.length);
    const normalizedShannon = maxShannon > 0 ? shannonIndex / maxShannon : 0;

    const score = (diversityScore * 0.4 + normalizedShannon * 0.6) * 100;
    return Math.round(Math.min(score, 100) * 100) / 100;
  }

  private computeGrowthVelocityScore(commitFrequency: { date: string; count: number }[]): number {
    if (commitFrequency.length < 14) return 0;

    // Compare recent 3 months vs prior 3 months
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    let recentCount = 0;
    let priorCount = 0;

    for (const day of commitFrequency) {
      const date = new Date(day.date);
      if (date >= threeMonthsAgo) {
        recentCount += day.count;
      } else if (date >= sixMonthsAgo) {
        priorCount += day.count;
      }
    }

    if (priorCount === 0) return recentCount > 0 ? 75 : 0;

    const growthRate = (recentCount - priorCount) / priorCount;

    // Sigmoid function to normalize: growth rate of 50% = score of ~70
    const normalized = 1 / (1 + Math.exp(-3 * growthRate));
    const score = normalized * 100;

    return Math.round(Math.min(score, 100) * 100) / 100;
  }

  private computeCollaborationScore(prStats: { total: number; merged: number; open: number }): number {
    if (prStats.total === 0) return 0;

    // PR contribution rate
    const prScore = Math.min(prStats.total / 50, 1) * 0.5;
    // Merge success rate
    const mergeRate = prStats.merged / prStats.total;
    const mergeScore = mergeRate * 0.5;

    const score = (prScore + mergeScore) * 100;
    return Math.round(Math.min(score, 100) * 100) / 100;
  }

  // GitHub API helpers
  private async fetchAllRepos(accessToken: string): Promise<GitHubRepo[]> {
    const allRepos: GitHubRepo[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await fetch(
        `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=pushed&type=all`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) break;
      const repos = (await response.json()) as GitHubRepo[];
      if (repos.length === 0) break;

      allRepos.push(...repos);
      if (repos.length < perPage) break;
      page++;
    }

    return allRepos;
  }

  private async fetchRepoLanguages(accessToken: string, fullName: string): Promise<Record<string, number>> {
    const response = await fetch(`https://api.github.com/repos/${fullName}/languages`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return {};
    return (await response.json()) as Record<string, number>;
  }

  private async fetchCommits(accessToken: string, fullName: string, author?: string): Promise<GitHubCommit[]> {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);

    const allCommits: GitHubCommit[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      let url = `https://api.github.com/repos/${fullName}/commits?per_page=${perPage}&page=${page}&since=${since.toISOString()}`;
      if (author) {
        url += `&author=${encodeURIComponent(author)}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) break;
      const commits = (await response.json()) as GitHubCommit[];
      if (commits.length === 0) break;

      allCommits.push(...commits);
      if (commits.length < perPage) break;
      page++;
    }

    return allCommits;
  }

  private async fetchPullRequests(accessToken: string, fullName: string): Promise<GitHubPR[]> {
    const response = await fetch(
      `https://api.github.com/repos/${fullName}/pulls?state=all&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) return [];
    return (await response.json()) as GitHubPR[];
  }
}
