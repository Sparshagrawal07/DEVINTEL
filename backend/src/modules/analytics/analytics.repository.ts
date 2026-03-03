import { query, queryOne } from '../../config/database';
import { DevScore, ScoreTrend, CareerTarget } from './analytics.types';

export class AnalyticsRepository {
  // Dev Scores
  async upsertDevScore(data: {
    user_id: string;
    consistency_score: number;
    technical_depth_score: number;
    collaboration_score: number;
    skill_relevance_score: number;
    growth_velocity_score: number;
    composite_score: number;
    breakdown: Record<string, any>;
  }): Promise<DevScore> {
    const result = await queryOne<DevScore>(
      `INSERT INTO dev_scores (
        user_id, consistency_score, technical_depth_score, collaboration_score,
        skill_relevance_score, growth_velocity_score, composite_score, breakdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
        consistency_score = EXCLUDED.consistency_score,
        technical_depth_score = EXCLUDED.technical_depth_score,
        collaboration_score = EXCLUDED.collaboration_score,
        skill_relevance_score = EXCLUDED.skill_relevance_score,
        growth_velocity_score = EXCLUDED.growth_velocity_score,
        composite_score = EXCLUDED.composite_score,
        breakdown = EXCLUDED.breakdown
      RETURNING *`,
      [
        data.user_id,
        data.consistency_score,
        data.technical_depth_score,
        data.collaboration_score,
        data.skill_relevance_score,
        data.growth_velocity_score,
        data.composite_score,
        JSON.stringify(data.breakdown),
      ]
    );
    return result!;
  }

  async getLatestScore(userId: string): Promise<DevScore | null> {
    return queryOne<DevScore>(
      'SELECT * FROM dev_scores WHERE user_id = $1 ORDER BY snapshot_date DESC LIMIT 1',
      [userId]
    );
  }

  async getScoreTrend(userId: string, days: number = 90): Promise<ScoreTrend[]> {
    return query<ScoreTrend>(
      `SELECT snapshot_date as date, composite_score, consistency_score,
              technical_depth_score, collaboration_score, skill_relevance_score,
              growth_velocity_score
       FROM dev_scores
       WHERE user_id = $1 AND snapshot_date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
       ORDER BY snapshot_date ASC`,
      [userId, days]
    );
  }

  // Skills
  async getUserSkills(userId: string): Promise<{ name: string; category: string; proficiency_level: number; source: string }[]> {
    return query(
      'SELECT name, category, proficiency_level, source FROM skills WHERE user_id = $1 ORDER BY proficiency_level DESC',
      [userId]
    );
  }

  // Activity Heatmap
  async getActivityHeatmap(userId: string, days: number = 365): Promise<{ date: string; count: number }[]> {
    return query(
      `SELECT DATE(committed_at AT TIME ZONE 'UTC') as date, COUNT(*)::int as count
       FROM commits WHERE user_id = $1 AND committed_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(committed_at AT TIME ZONE 'UTC')
       ORDER BY date`,
      [userId, days]
    );
  }

  // Recent Activity
  async getRecentActivity(userId: string, limit: number = 20): Promise<any[]> {
    return query(
      `SELECT action, metadata, created_at as timestamp
       FROM activity_logs WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
  }

  // Career Targets
  async createCareerTarget(userId: string, data: {
    role_title: string;
    required_skills: string[];
    preferred_skills?: string[];
    min_experience_years?: number;
    target_companies?: string[];
    notes?: string;
  }): Promise<CareerTarget> {
    const result = await queryOne<CareerTarget>(
      `INSERT INTO career_targets (user_id, role_title, required_skills, preferred_skills, min_experience_years, target_companies, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        data.role_title,
        data.required_skills,
        data.preferred_skills ?? [],
        data.min_experience_years ?? 0,
        data.target_companies ?? [],
        data.notes ?? null,
      ]
    );
    return result!;
  }

  async getCareerTargets(userId: string): Promise<CareerTarget[]> {
    return query<CareerTarget>(
      'SELECT * FROM career_targets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
  }

  async getActiveCareerTarget(userId: string): Promise<CareerTarget | null> {
    return queryOne<CareerTarget>(
      'SELECT * FROM career_targets WHERE user_id = $1 AND is_active = true LIMIT 1',
      [userId]
    );
  }

  async updateCareerTarget(id: string, data: Partial<CareerTarget>): Promise<CareerTarget | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.role_title) { fields.push(`role_title = $${idx++}`); values.push(data.role_title); }
    if (data.required_skills) { fields.push(`required_skills = $${idx++}`); values.push(data.required_skills); }
    if (data.preferred_skills) { fields.push(`preferred_skills = $${idx++}`); values.push(data.preferred_skills); }
    if (data.min_experience_years !== undefined) { fields.push(`min_experience_years = $${idx++}`); values.push(data.min_experience_years); }
    if (data.target_companies) { fields.push(`target_companies = $${idx++}`); values.push(data.target_companies); }
    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
    if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.is_active); }

    if (fields.length === 0) return null;
    values.push(id);

    return queryOne<CareerTarget>(
      `UPDATE career_targets SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
  }

  async deleteCareerTarget(id: string): Promise<void> {
    await query('DELETE FROM career_targets WHERE id = $1', [id]);
  }
}
