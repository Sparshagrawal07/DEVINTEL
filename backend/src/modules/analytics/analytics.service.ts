import { AnalyticsRepository } from './analytics.repository';
import { GitHubService } from '../github/github.service';
import { GitHubRepository } from '../github/github.repository';
import { ResumeRepository } from '../resume/resume.repository';
import { LeetCodeRepository } from '../leetcode/leetcode.repository';
import { DashboardData, DevScore, SkillGap, CreateCareerTargetDTO } from './analytics.types';
import { cacheGet, cacheSet, cacheDelete } from '../../config/redis';
import { logger } from '../../config/logger';

export class AnalyticsService {
  private ghService: GitHubService;
  private lcRepo: LeetCodeRepository;

  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly resumeRepo: ResumeRepository
  ) {
    this.ghService = new GitHubService(new GitHubRepository());
    this.lcRepo = new LeetCodeRepository();
  }

  /**
   * Compute and store composite DevScore
   *
   * DevScore =
   *   0.25 * Consistency +
   *   0.20 * TechnicalDepth +
   *   0.20 * Collaboration +
   *   0.15 * SkillRelevance +
   *   0.20 * GrowthVelocity
   */
  async computeDevScore(userId: string): Promise<DevScore> {
    // Get GitHub intelligence metrics
    const metrics = await this.ghService.computeIntelligenceMetrics(userId);

    // Get skill relevance from latest resume analysis
    let skillRelevanceScore = 0;
    const latestResume = await this.resumeRepo.getLatestByUser(userId);
    if (latestResume) {
      skillRelevanceScore = Number(latestResume.skill_match_score) || 0;
    }

    // Compute composite score
    const compositeScore = Math.round(
      (0.25 * metrics.consistencyScore +
       0.20 * metrics.technicalBreadthScore +
       0.20 * metrics.collaborationScore +
       0.15 * skillRelevanceScore +
       0.20 * metrics.growthVelocityScore) * 100
    ) / 100;

    const breakdown = {
      weights: {
        consistency: 0.25,
        technicalDepth: 0.20,
        collaboration: 0.20,
        skillRelevance: 0.15,
        growthVelocity: 0.20,
      },
      metrics: {
        totalCommits: metrics.totalCommits,
        totalPRs: metrics.totalPRs,
        mergedPRs: metrics.mergedPRs,
        activeDays: metrics.activeDays,
        streakDays: metrics.streakDays,
        languageCount: metrics.languageDistribution.length,
      },
    };

    const devScore = await this.analyticsRepo.upsertDevScore({
      user_id: userId,
      consistency_score: metrics.consistencyScore,
      technical_depth_score: metrics.technicalBreadthScore,
      collaboration_score: metrics.collaborationScore,
      skill_relevance_score: skillRelevanceScore,
      growth_velocity_score: metrics.growthVelocityScore,
      composite_score: compositeScore,
      breakdown,
    });

    // Invalidate dashboard cache
    await cacheDelete(`dashboard:${userId}`);

    return devScore;
  }

  async getDashboard(userId: string): Promise<DashboardData> {
    // Check cache first
    const cached = await cacheGet<DashboardData>(`dashboard:${userId}`);
    if (cached) return cached;

    const [currentScore, scoreTrend, skills, heatmap, recentActivity, activeTarget] = await Promise.all([
      this.analyticsRepo.getLatestScore(userId),
      this.analyticsRepo.getScoreTrend(userId, 90),
      this.analyticsRepo.getUserSkills(userId),
      this.analyticsRepo.getActivityHeatmap(userId, 365),
      this.analyticsRepo.getRecentActivity(userId, 20),
      this.analyticsRepo.getActiveCareerTarget(userId),
    ]);

    let lcProfile = null;
    try {
      lcProfile = await this.lcRepo.getProfileByUser(userId);
    } catch (error) {
      logger.warn('LeetCode profile unavailable; continuing without LeetCode data', error);
    }

    // Compute skill gaps
    const skillGaps: SkillGap[] = [];
    if (activeTarget) {
      const userSkillMap = new Map(skills.map((s) => [s.name.toLowerCase(), s.proficiency_level]));

      for (const reqSkill of activeTarget.required_skills) {
        const currentLevel = userSkillMap.get(reqSkill.toLowerCase()) || 0;
        const requiredLevel = 80; // Target proficiency
        if (currentLevel < requiredLevel) {
          skillGaps.push({
            skill: reqSkill,
            category: 'Required',
            current_level: currentLevel,
            required_level: requiredLevel,
            gap: requiredLevel - currentLevel,
          });
        }
      }

      for (const prefSkill of activeTarget.preferred_skills) {
        const currentLevel = userSkillMap.get(prefSkill.toLowerCase()) || 0;
        const requiredLevel = 60;
        if (currentLevel < requiredLevel) {
          skillGaps.push({
            skill: prefSkill,
            category: 'Preferred',
            current_level: currentLevel,
            required_level: requiredLevel,
            gap: requiredLevel - currentLevel,
          });
        }
      }
    }

    // Get language distribution from the GitHub service
    const ghRepo = new GitHubRepository();
    const langDist = await ghRepo.getLanguageDistribution(userId);
    const totalBytes = langDist.reduce((sum, l) => sum + Number(l.total_bytes), 0);
    const topLanguages = langDist.slice(0, 8).map((l) => ({
      language: l.language,
      percentage: totalBytes > 0 ? Math.round((Number(l.total_bytes) / totalBytes) * 10000) / 100 : 0,
    }));

    // Build LeetCode dashboard section
    let leetcodeData: DashboardData['leetcode'] = null;
    if (lcProfile) {
      let lcCalendar: { date: string; count: number }[] = [];
      try {
        lcCalendar = await this.lcRepo.getSubmissionCalendar(userId, 365);
      } catch (error) {
        logger.warn('LeetCode calendar unavailable; continuing with partial LeetCode data', error);
      }

      leetcodeData = {
        connected: true,
        username: lcProfile.leetcode_username,
        totalSolved: lcProfile.total_solved,
        easySolved: lcProfile.easy_solved,
        mediumSolved: lcProfile.medium_solved,
        hardSolved: lcProfile.hard_solved,
        acceptanceRate: Number(lcProfile.acceptance_rate),
        ranking: lcProfile.ranking,
        contestRating: lcProfile.contest_rating,
        contestsAttended: lcProfile.contests_attended,
        streak: lcProfile.streak,
        submissionCalendar: lcCalendar,
      };
    }

    const dashboard: DashboardData = {
      currentScore,
      scoreTrend,
      skillGaps: skillGaps.sort((a, b) => b.gap - a.gap),
      activityHeatmap: heatmap,
      topLanguages,
      recentActivity,
      leetcode: leetcodeData,
    };

    // Cache for 5 minutes
    await cacheSet(`dashboard:${userId}`, dashboard, 300);

    return dashboard;
  }

  async getScoreTrend(userId: string, days: number = 90) {
    return this.analyticsRepo.getScoreTrend(userId, days);
  }

  async getSkills(userId: string) {
    return this.analyticsRepo.getUserSkills(userId);
  }

  // Career Targets
  async createTarget(userId: string, data: CreateCareerTargetDTO) {
    // Deactivate previous targets
    const existing = await this.analyticsRepo.getCareerTargets(userId);
    for (const target of existing) {
      if (target.is_active) {
        await this.analyticsRepo.updateCareerTarget(target.id, { is_active: false });
      }
    }

    return this.analyticsRepo.createCareerTarget(userId, data);
  }

  async getTargets(userId: string) {
    return this.analyticsRepo.getCareerTargets(userId);
  }

  async updateTarget(id: string, data: Partial<CreateCareerTargetDTO>) {
    return this.analyticsRepo.updateCareerTarget(id, data);
  }

  async deleteTarget(id: string) {
    return this.analyticsRepo.deleteCareerTarget(id);
  }
}
