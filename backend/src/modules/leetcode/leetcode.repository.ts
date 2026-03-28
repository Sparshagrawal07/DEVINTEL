import { query, queryOne } from '../../config/database';
import { LeetCodeProfile, LeetCodeSubmission } from './leetcode.types';
import { logger } from '../../config/logger';

export class LeetCodeRepository {
  private isMissingRelationError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '42P01'
    );
  }

  async upsertProfile(data: {
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
    skills_tags: string[];
    contest_rating: number | null;
    contests_attended: number;
    badge_count: number;
    streak: number;
    last_synced_at: Date;
  }): Promise<LeetCodeProfile> {
    try {
      const result = await queryOne<LeetCodeProfile>(
        `INSERT INTO leetcode_profiles (
          user_id, leetcode_username, total_solved, easy_solved, medium_solved, hard_solved,
          acceptance_rate, ranking, contribution_points, reputation, total_submissions,
          skills_tags, contest_rating, contests_attended, badge_count, streak, last_synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (user_id) DO UPDATE SET
          leetcode_username = EXCLUDED.leetcode_username,
          total_solved = EXCLUDED.total_solved,
          easy_solved = EXCLUDED.easy_solved,
          medium_solved = EXCLUDED.medium_solved,
          hard_solved = EXCLUDED.hard_solved,
          acceptance_rate = EXCLUDED.acceptance_rate,
          ranking = EXCLUDED.ranking,
          contribution_points = EXCLUDED.contribution_points,
          reputation = EXCLUDED.reputation,
          total_submissions = EXCLUDED.total_submissions,
          skills_tags = EXCLUDED.skills_tags,
          contest_rating = EXCLUDED.contest_rating,
          contests_attended = EXCLUDED.contests_attended,
          badge_count = EXCLUDED.badge_count,
          streak = EXCLUDED.streak,
          last_synced_at = EXCLUDED.last_synced_at,
          updated_at = NOW()
        RETURNING *`,
        [
          data.user_id, data.leetcode_username, data.total_solved, data.easy_solved,
          data.medium_solved, data.hard_solved, data.acceptance_rate, data.ranking,
          data.contribution_points, data.reputation, data.total_submissions,
          data.skills_tags, data.contest_rating, data.contests_attended,
          data.badge_count, data.streak, data.last_synced_at,
        ]
      );
      return result!;
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        logger.warn('LeetCode tables missing; skipping profile upsert');
        throw new Error('LeetCode integration is unavailable on this deployment');
      }
      throw error;
    }
  }

  async getProfileByUser(userId: string): Promise<LeetCodeProfile | null> {
    try {
      return queryOne<LeetCodeProfile>(
        'SELECT * FROM leetcode_profiles WHERE user_id = $1',
        [userId]
      );
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        return null;
      }
      throw error;
    }
  }

  async deleteProfile(userId: string): Promise<void> {
    try {
      await query('DELETE FROM leetcode_profiles WHERE user_id = $1', [userId]);
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        return;
      }
      throw error;
    }
  }

  async upsertSubmission(data: {
    user_id: string;
    leetcode_profile_id: string;
    title: string;
    title_slug: string;
    difficulty: string;
    status: string;
    language: string;
    runtime: string | null;
    memory: string | null;
    timestamp: number;
    submitted_at: Date;
  }): Promise<LeetCodeSubmission> {
    try {
      const result = await queryOne<LeetCodeSubmission>(
        `INSERT INTO leetcode_submissions (
          user_id, leetcode_profile_id, title, title_slug, difficulty, status,
          language, runtime, memory, timestamp, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (leetcode_profile_id, title_slug, timestamp) DO UPDATE SET
          status = EXCLUDED.status,
          runtime = EXCLUDED.runtime,
          memory = EXCLUDED.memory
        RETURNING *`,
        [
          data.user_id, data.leetcode_profile_id, data.title, data.title_slug,
          data.difficulty, data.status, data.language, data.runtime,
          data.memory, data.timestamp, data.submitted_at,
        ]
      );
      return result!;
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        throw new Error('LeetCode integration is unavailable on this deployment');
      }
      throw error;
    }
  }

  async getRecentSubmissions(userId: string, limit: number = 20): Promise<LeetCodeSubmission[]> {
    try {
      return query<LeetCodeSubmission>(
        `SELECT * FROM leetcode_submissions
         WHERE user_id = $1
         ORDER BY submitted_at DESC LIMIT $2`,
        [userId, limit]
      );
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        return [];
      }
      throw error;
    }
  }

  async getSubmissionCalendar(userId: string, days: number = 365): Promise<{ date: string; count: number }[]> {
    try {
      return query<{ date: string; count: number }>(
        `SELECT DATE(submitted_at AT TIME ZONE 'UTC') as date, COUNT(*)::int as count
         FROM leetcode_submissions
         WHERE user_id = $1 AND submitted_at >= NOW() - INTERVAL '1 day' * $2
         GROUP BY DATE(submitted_at AT TIME ZONE 'UTC')
         ORDER BY date`,
        [userId, days]
      );
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        return [];
      }
      throw error;
    }
  }

  async getDifficultyBreakdown(userId: string): Promise<{ difficulty: string; count: number }[]> {
    try {
      return query<{ difficulty: string; count: number }>(
        `SELECT difficulty, COUNT(DISTINCT title_slug)::int as count
         FROM leetcode_submissions
         WHERE user_id = $1 AND status = 'Accepted'
         GROUP BY difficulty`,
        [userId]
      );
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        return [];
      }
      throw error;
    }
  }
}
