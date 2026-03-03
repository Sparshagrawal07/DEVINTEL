import { query, queryOne } from '../../config/database';
import { UserProfile, UserStats, UpdateProfileDTO } from './users.types';

export class UsersRepository {
  async findById(id: string): Promise<UserProfile | null> {
    return queryOne<UserProfile>(
      `SELECT id, email, username, display_name, avatar_url, bio, location, is_active, is_onboarded, onboarding_step, created_at
       FROM users WHERE id = $1`,
      [id]
    );
  }

  async findByUsername(username: string): Promise<UserProfile | null> {
    return queryOne<UserProfile>(
      `SELECT id, email, username, display_name, avatar_url, bio, location, is_active, is_onboarded, onboarding_step, created_at
       FROM users WHERE username = $1`,
      [username]
    );
  }

  async updateProfile(userId: string, data: UpdateProfileDTO): Promise<UserProfile | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.display_name !== undefined) {
      fields.push(`display_name = $${idx++}`);
      values.push(data.display_name);
    }
    if (data.bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(data.bio);
    }
    if (data.location !== undefined) {
      fields.push(`location = $${idx++}`);
      values.push(data.location);
    }
    if (data.avatar_url !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(data.avatar_url);
    }

    if (fields.length === 0) return this.findById(userId);

    values.push(userId);

    return queryOne<UserProfile>(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id, email, username, display_name, avatar_url, bio, location, is_active, is_onboarded, onboarding_step, created_at`,
      values
    );
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const stats = await queryOne<UserStats>(`
      SELECT
        (SELECT COUNT(*)::int FROM repositories WHERE user_id = $1) AS total_repos,
        (SELECT COUNT(*)::int FROM commits WHERE user_id = $1) AS total_commits,
        (SELECT COUNT(*)::int FROM pull_requests WHERE user_id = $1) AS total_prs,
        (SELECT COUNT(*)::int FROM skills WHERE user_id = $1) AS total_skills,
        (SELECT composite_score FROM dev_scores WHERE user_id = $1 ORDER BY snapshot_date DESC LIMIT 1) AS latest_dev_score,
        (SELECT created_at FROM users WHERE id = $1) AS member_since,
        (SELECT total_solved FROM leetcode_profiles WHERE user_id = $1) AS leetcode_solved,
        (SELECT leetcode_username FROM leetcode_profiles WHERE user_id = $1) AS leetcode_username
    `, [userId]);

    return stats ?? {
      total_repos: 0,
      total_commits: 0,
      total_prs: 0,
      total_skills: 0,
      latest_dev_score: null,
      member_since: new Date(),
      leetcode_solved: null,
      leetcode_username: null,
    };
  }

  async deleteUser(userId: string): Promise<void> {
    await query('DELETE FROM users WHERE id = $1', [userId]);
  }
}
