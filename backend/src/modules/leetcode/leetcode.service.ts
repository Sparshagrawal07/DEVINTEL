import { LeetCodeRepository } from './leetcode.repository';
import {
  LeetCodeStats,
  LCMatchedUser,
  LCContestInfo,
  LCRecentSubmission,
  LeetCodeCalendarEntry,
} from './leetcode.types';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { cacheDelete } from '../../config/redis';
import { logger } from '../../config/logger';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

export class LeetCodeService {
  constructor(private readonly lcRepo: LeetCodeRepository) {}

  async connect(userId: string, username: string): Promise<LeetCodeStats> {
    // Validate username exists on LeetCode
    const profile = await this.fetchUserProfile(username);
    if (!profile) {
      throw new BadRequestError(`LeetCode user "${username}" not found`);
    }

    // Sync all data
    return this.syncProfile(userId, username);
  }

  async disconnect(userId: string): Promise<void> {
    await this.lcRepo.deleteProfile(userId);
    await cacheDelete(`dashboard:${userId}`);
  }

  async syncProfile(userId: string, username?: string): Promise<LeetCodeStats> {
    let lcUsername = username;

    if (!lcUsername) {
      const existing = await this.lcRepo.getProfileByUser(userId);
      if (!existing) throw new BadRequestError('LeetCode account not connected');
      lcUsername = existing.leetcode_username;
    }

    // Fetch all data from LeetCode API in parallel
    const [profile, contestInfo, recentSubmissions] = await Promise.all([
      this.fetchUserProfile(lcUsername),
      this.fetchContestInfo(lcUsername),
      this.fetchRecentSubmissions(lcUsername),
    ]);

    if (!profile) {
      throw new BadRequestError(`LeetCode user "${lcUsername}" not found`);
    }

    const acStats = profile.submitStatsGlobal.acSubmissionNum;
    const totalSolved = acStats.find((s) => s.difficulty === 'All')?.count ?? 0;
    const easySolved = acStats.find((s) => s.difficulty === 'Easy')?.count ?? 0;
    const mediumSolved = acStats.find((s) => s.difficulty === 'Medium')?.count ?? 0;
    const hardSolved = acStats.find((s) => s.difficulty === 'Hard')?.count ?? 0;
    const totalSubmissions = acStats.reduce((sum, s) => sum + s.submissions, 0);
    const acceptedSubmissions = acStats.find((s) => s.difficulty === 'All')?.submissions ?? 0;
    const acceptanceRate = totalSubmissions > 0
      ? Math.round((acceptedSubmissions / totalSubmissions) * 10000) / 100
      : 0;

    const streak = profile.userCalendar?.streak ?? 0;
    const badgeCount = profile.badges?.length ?? 0;

    // Upsert profile
    const savedProfile = await this.lcRepo.upsertProfile({
      user_id: userId,
      leetcode_username: lcUsername,
      total_solved: totalSolved,
      easy_solved: easySolved,
      medium_solved: mediumSolved,
      hard_solved: hardSolved,
      acceptance_rate: acceptanceRate,
      ranking: profile.profile.ranking,
      contribution_points: profile.profile.contributionPoints,
      reputation: profile.profile.reputation,
      total_submissions: totalSubmissions,
      skills_tags: [],
      contest_rating: contestInfo?.userContestRanking?.rating
        ? Math.round(contestInfo.userContestRanking.rating)
        : null,
      contests_attended: contestInfo?.userContestRanking?.attendedContestsCount ?? 0,
      badge_count: badgeCount,
      streak,
      last_synced_at: new Date(),
    });

    // Store recent submissions
    for (const sub of recentSubmissions) {
      try {
        await this.lcRepo.upsertSubmission({
          user_id: userId,
          leetcode_profile_id: savedProfile.id,
          title: sub.title,
          title_slug: sub.titleSlug,
          difficulty: 'Medium', // LeetCode recent API doesn't include difficulty; we'll update later
          status: sub.statusDisplay,
          language: sub.lang,
          runtime: sub.runtime || null,
          memory: sub.memory || null,
          timestamp: parseInt(sub.timestamp, 10),
          submitted_at: new Date(parseInt(sub.timestamp, 10) * 1000),
        });
      } catch (error) {
        logger.error(`Failed to upsert submission ${sub.titleSlug}:`, error);
      }
    }

    // Parse submission calendar from LeetCode
    const calendarEntries = this.parseSubmissionCalendar(profile.submissionCalendar);

    // Invalidate dashboard cache
    await cacheDelete(`dashboard:${userId}`);

    return {
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      acceptanceRate,
      ranking: profile.profile.ranking,
      contestRating: contestInfo?.userContestRanking?.rating
        ? Math.round(contestInfo.userContestRanking.rating)
        : null,
      contestsAttended: contestInfo?.userContestRanking?.attendedContestsCount ?? 0,
      streak,
      totalSubmissions,
      recentSubmissions: [],
      submissionCalendar: calendarEntries,
      skillTags: [],
    };
  }

  async getStats(userId: string): Promise<LeetCodeStats> {
    const profile = await this.lcRepo.getProfileByUser(userId);
    if (!profile) throw new NotFoundError('LeetCode profile');

    const [recentSubs, calendar] = await Promise.all([
      this.lcRepo.getRecentSubmissions(userId, 20),
      this.lcRepo.getSubmissionCalendar(userId, 365),
    ]);

    return {
      totalSolved: profile.total_solved,
      easySolved: profile.easy_solved,
      mediumSolved: profile.medium_solved,
      hardSolved: profile.hard_solved,
      acceptanceRate: Number(profile.acceptance_rate),
      ranking: profile.ranking,
      contestRating: profile.contest_rating,
      contestsAttended: profile.contests_attended,
      streak: profile.streak,
      totalSubmissions: profile.total_submissions,
      recentSubmissions: recentSubs,
      submissionCalendar: calendar,
      skillTags: profile.skills_tags || [],
    };
  }

  async getProfile(userId: string) {
    return this.lcRepo.getProfileByUser(userId);
  }

  // ============================================================
  // LeetCode GraphQL API helpers
  // ============================================================

  private async fetchUserProfile(username: string): Promise<LCMatchedUser | null> {
    const graphqlQuery = {
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              ranking
              reputation
              contributionPoints
              starRating
            }
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
                submissions
              }
            }
            submissionCalendar
            badges {
              id
            }
            userCalendar {
              streak
              totalActiveDays
              activeYears
            }
          }
        }
      `,
      variables: { username },
    };

    try {
      const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
        },
        body: JSON.stringify(graphqlQuery),
      });

      if (!response.ok) return null;
      const data: any = await response.json();
      return data?.data?.matchedUser ?? null;
    } catch (error) {
      logger.error('Failed to fetch LeetCode profile:', error);
      return null;
    }
  }

  private async fetchContestInfo(username: string): Promise<LCContestInfo | null> {
    const graphqlQuery = {
      query: `
        query userContestRankingInfo($username: String!) {
          userContestRanking(username: $username) {
            rating
            attendedContestsCount
          }
        }
      `,
      variables: { username },
    };

    try {
      const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
        },
        body: JSON.stringify(graphqlQuery),
      });

      if (!response.ok) return null;
      const data: any = await response.json();
      return data?.data ?? null;
    } catch (error) {
      logger.error('Failed to fetch LeetCode contest info:', error);
      return null;
    }
  }

  private async fetchRecentSubmissions(username: string): Promise<LCRecentSubmission[]> {
    const graphqlQuery = {
      query: `
        query recentAcSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            title
            titleSlug
            statusDisplay
            lang
            runtime
            memory
            timestamp
          }
        }
      `,
      variables: { username, limit: 20 },
    };

    try {
      const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
        },
        body: JSON.stringify(graphqlQuery),
      });

      if (!response.ok) return [];
      const data: any = await response.json();
      return data?.data?.recentAcSubmissionList ?? [];
    } catch (error) {
      logger.error('Failed to fetch LeetCode submissions:', error);
      return [];
    }
  }

  private parseSubmissionCalendar(calendarStr: string): LeetCodeCalendarEntry[] {
    try {
      const calendar = JSON.parse(calendarStr || '{}') as Record<string, number>;
      return Object.entries(calendar).map(([timestamp, count]) => ({
        date: new Date(parseInt(timestamp, 10) * 1000).toISOString().split('T')[0],
        count,
      }));
    } catch {
      return [];
    }
  }
}
