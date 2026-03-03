import { query, queryOne } from '../../config/database';
import type { UserLink, Education } from './onboarding.types';

export class OnboardingRepository {
  // ---- User fields ----
  async getUserOnboardingData(userId: string) {
    return queryOne<{
      username: string;
      password_hash: string | null;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      is_onboarded: boolean;
      onboarding_step: number;
    }>(
      `SELECT username, password_hash, display_name, avatar_url, bio, is_onboarded, onboarding_step
       FROM users WHERE id = $1`,
      [userId]
    );
  }

  async isUsernameTaken(username: string, excludeUserId: string): Promise<boolean> {
    const row = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
      [username, excludeUserId]
    );
    return !!row;
  }

  async updateUsername(userId: string, username: string): Promise<void> {
    await query('UPDATE users SET username = $1 WHERE id = $2', [username, userId]);
  }

  async updatePasswordHash(userId: string, hash: string): Promise<void> {
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
  }

  async updateProfile(userId: string, displayName: string, avatarUrl?: string): Promise<void> {
    await query('UPDATE users SET display_name = $1, avatar_url = $2 WHERE id = $3', [
      displayName,
      avatarUrl || null,
      userId,
    ]);
  }

  async updateBio(userId: string, bio: string): Promise<void> {
    await query('UPDATE users SET bio = $1 WHERE id = $2', [bio, userId]);
  }

  async setOnboardingStep(userId: string, step: number): Promise<void> {
    await query('UPDATE users SET onboarding_step = $1 WHERE id = $2', [step, userId]);
  }

  async completeOnboarding(userId: string): Promise<void> {
    await query('UPDATE users SET is_onboarded = TRUE, onboarding_step = 9 WHERE id = $1', [userId]);
  }

  // ---- User Links ----
  async replaceUserLinks(userId: string, links: UserLink[]): Promise<void> {
    await query('DELETE FROM user_links WHERE user_id = $1', [userId]);
    for (const link of links) {
      await query(
        `INSERT INTO user_links (user_id, link_type, url, label)
         VALUES ($1, $2, $3, $4)`,
        [userId, link.link_type, link.url, link.label || null]
      );
    }
  }

  async getUserLinks(userId: string): Promise<UserLink[]> {
    return query<UserLink>(
      'SELECT id, link_type, url, label FROM user_links WHERE user_id = $1 ORDER BY created_at',
      [userId]
    );
  }

  // ---- Education ----
  async replaceEducation(userId: string, entries: Education[]): Promise<void> {
    await query('DELETE FROM education WHERE user_id = $1', [userId]);
    for (const edu of entries) {
      await query(
        `INSERT INTO education (user_id, degree, institution, field_of_study, start_year, end_year, is_current, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          edu.degree,
          edu.institution,
          edu.field_of_study || null,
          edu.start_year,
          edu.end_year || null,
          edu.is_current || false,
          edu.description || null,
        ]
      );
    }
  }

  async getUserEducation(userId: string): Promise<Education[]> {
    return query<Education>(
      'SELECT id, degree, institution, field_of_study, start_year, end_year, is_current, description FROM education WHERE user_id = $1 ORDER BY start_year DESC',
      [userId]
    );
  }

  // ---- Skills (manual source) ----
  async replaceManualSkills(userId: string, skills: string[]): Promise<void> {
    await query("DELETE FROM skills WHERE user_id = $1 AND source = 'manual'", [userId]);
    for (const skill of skills) {
      await query(
        `INSERT INTO skills (user_id, name, category, source, proficiency_level)
         VALUES ($1, $2, 'General', 'manual', 50)
         ON CONFLICT (user_id, name, source) DO NOTHING`,
        [userId, skill]
      );
    }
  }

  async getManualSkills(userId: string): Promise<string[]> {
    const rows = await query<{ name: string }>(
      "SELECT name FROM skills WHERE user_id = $1 AND source = 'manual' ORDER BY name",
      [userId]
    );
    return rows.map((r) => r.name);
  }
}
