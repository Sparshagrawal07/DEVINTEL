import { query, queryOne } from '../../config/database';
import { Repository, Commit, PullRequest } from './github.types';

export class GitHubRepository {
  // Repositories
  async upsertRepo(data: Omit<Repository, 'id' | 'created_at' | 'updated_at'>): Promise<Repository> {
    const result = await queryOne<Repository>(
      `INSERT INTO repositories (
        user_id, github_id, name, full_name, description, html_url, clone_url,
        language, languages_breakdown, stars_count, forks_count, watchers_count,
        open_issues_count, is_fork, is_private, is_archived, size_kb, default_branch,
        topics, last_synced_at, repo_created_at, repo_updated_at, repo_pushed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      ON CONFLICT (user_id, github_id) DO UPDATE SET
        name = EXCLUDED.name,
        full_name = EXCLUDED.full_name,
        description = EXCLUDED.description,
        language = EXCLUDED.language,
        languages_breakdown = EXCLUDED.languages_breakdown,
        stars_count = EXCLUDED.stars_count,
        forks_count = EXCLUDED.forks_count,
        watchers_count = EXCLUDED.watchers_count,
        open_issues_count = EXCLUDED.open_issues_count,
        is_archived = EXCLUDED.is_archived,
        size_kb = EXCLUDED.size_kb,
        topics = EXCLUDED.topics,
        last_synced_at = EXCLUDED.last_synced_at,
        repo_updated_at = EXCLUDED.repo_updated_at,
        repo_pushed_at = EXCLUDED.repo_pushed_at,
        updated_at = NOW()
      RETURNING *`,
      [
        data.user_id, data.github_id, data.name, data.full_name, data.description,
        data.html_url, data.clone_url, data.language, JSON.stringify(data.languages_breakdown),
        data.stars_count, data.forks_count, data.watchers_count, data.open_issues_count,
        data.is_fork, data.is_private, data.is_archived, data.size_kb, data.default_branch,
        data.topics, data.last_synced_at, data.repo_created_at, data.repo_updated_at, data.repo_pushed_at,
      ]
    );
    return result!;
  }

  async findReposByUser(userId: string): Promise<Repository[]> {
    return query<Repository>(
      'SELECT * FROM repositories WHERE user_id = $1 ORDER BY repo_pushed_at DESC NULLS LAST',
      [userId]
    );
  }

  async findRepoById(id: string): Promise<Repository | null> {
    return queryOne<Repository>('SELECT * FROM repositories WHERE id = $1', [id]);
  }

  // Commits
  async upsertCommit(data: Omit<Commit, 'id' | 'created_at'>): Promise<Commit> {
    const result = await queryOne<Commit>(
      `INSERT INTO commits (repository_id, user_id, sha, message, author_name, author_email, additions, deletions, changed_files, committed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (repository_id, sha) DO UPDATE SET
         additions = EXCLUDED.additions,
         deletions = EXCLUDED.deletions,
         changed_files = EXCLUDED.changed_files
       RETURNING *`,
      [
        data.repository_id, data.user_id, data.sha, data.message,
        data.author_name, data.author_email, data.additions, data.deletions,
        data.changed_files, data.committed_at,
      ]
    );
    return result!;
  }

  async getCommitsByUser(userId: string, limit: number = 100): Promise<Commit[]> {
    return query<Commit>(
      'SELECT * FROM commits WHERE user_id = $1 ORDER BY committed_at DESC LIMIT $2',
      [userId, limit]
    );
  }

  async getCommitFrequency(userId: string, days: number = 365): Promise<{ date: string; count: number }[]> {
    return query<{ date: string; count: number }>(
      `SELECT DATE(committed_at AT TIME ZONE 'UTC') as date, COUNT(*)::int as count
       FROM commits
       WHERE user_id = $1 AND committed_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(committed_at AT TIME ZONE 'UTC')
       ORDER BY date`,
      [userId, days]
    );
  }

  async getCommitStreak(userId: string): Promise<number> {
    const result = await query<{ date: string }>(
      `SELECT DISTINCT DATE(committed_at) as date
       FROM commits WHERE user_id = $1
       ORDER BY date DESC`,
      [userId]
    );

    if (result.length === 0) return 0;

    let streak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDate = new Date(result[0].date);
    firstDate.setHours(0, 0, 0, 0);

    const diffFromToday = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffFromToday > 1) return 0;

    for (let i = 1; i < result.length; i++) {
      const prev = new Date(result[i - 1].date);
      const curr = new Date(result[i].date);
      const diff = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  // Pull Requests
  async upsertPR(data: Omit<PullRequest, 'id' | 'created_at'>): Promise<PullRequest> {
    const result = await queryOne<PullRequest>(
      `INSERT INTO pull_requests (repository_id, user_id, github_pr_id, number, title, state, is_merged, additions, deletions, changed_files, comments_count, review_comments_count, pr_created_at, pr_closed_at, pr_merged_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (repository_id, github_pr_id) DO UPDATE SET
         state = EXCLUDED.state,
         is_merged = EXCLUDED.is_merged,
         comments_count = EXCLUDED.comments_count,
         review_comments_count = EXCLUDED.review_comments_count,
         pr_closed_at = EXCLUDED.pr_closed_at,
         pr_merged_at = EXCLUDED.pr_merged_at
       RETURNING *`,
      [
        data.repository_id, data.user_id, data.github_pr_id, data.number, data.title,
        data.state, data.is_merged, data.additions, data.deletions, data.changed_files,
        data.comments_count, data.review_comments_count,
        data.pr_created_at, data.pr_closed_at, data.pr_merged_at,
      ]
    );
    return result!;
  }

  async getPRsByUser(userId: string): Promise<PullRequest[]> {
    return query<PullRequest>(
      'SELECT * FROM pull_requests WHERE user_id = $1 ORDER BY pr_created_at DESC',
      [userId]
    );
  }

  async getPRStats(userId: string): Promise<{ total: number; merged: number; open: number }> {
    const result = await queryOne<{ total: number; merged: number; open: number }>(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_merged = true)::int AS merged,
        COUNT(*) FILTER (WHERE state = 'open')::int AS open
      FROM pull_requests WHERE user_id = $1
    `, [userId]);
    return result ?? { total: 0, merged: 0, open: 0 };
  }

  // Language distribution
  async getLanguageDistribution(userId: string): Promise<{ language: string; total_bytes: number }[]> {
    return query<{ language: string; total_bytes: number }>(
      `SELECT language, SUM(size_kb * 1024)::bigint as total_bytes
       FROM repositories
       WHERE user_id = $1 AND language IS NOT NULL AND is_fork = false
       GROUP BY language
       ORDER BY total_bytes DESC`,
      [userId]
    );
  }

  async getActiveDaysCount(userId: string, days: number = 365): Promise<number> {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT DATE(committed_at))::int as count
       FROM commits
       WHERE user_id = $1 AND committed_at >= NOW() - INTERVAL '1 day' * $2`,
      [userId, days]
    );
    return result?.count ?? 0;
  }
}
