import { apiClient } from './api';
import type { Repository, IntelligenceMetrics, DashboardData, ResumeAnalysis, DevScore, CareerTarget, UserStats, ScoreTrend, LeetCodeStats, LeetCodeProfile } from '../types';

export const githubService = {
  async syncAll() {
    const res = await apiClient.post<{ repositories: number; commits: number; pullRequests: number }>('/github/sync');
    return res.data!;
  },

  async getRepos() {
    const res = await apiClient.get<{ repositories: Repository[] }>('/github/repos');
    return res.data!.repositories;
  },

  async getMetrics() {
    const res = await apiClient.get<{ metrics: IntelligenceMetrics }>('/github/metrics');
    return res.data!.metrics;
  },
};

export const leetcodeService = {
  async connect(username: string) {
    const res = await apiClient.post<{ stats: LeetCodeStats }>('/leetcode/connect', { username });
    return res.data!.stats;
  },

  async disconnect() {
    await apiClient.post('/leetcode/disconnect');
  },

  async sync() {
    const res = await apiClient.post<{ stats: LeetCodeStats }>('/leetcode/sync');
    return res.data!.stats;
  },

  async getStats() {
    const res = await apiClient.get<{ stats: LeetCodeStats }>('/leetcode/stats');
    return res.data!.stats;
  },

  async getProfile() {
    const res = await apiClient.get<{ profile: LeetCodeProfile | null }>('/leetcode/profile');
    return res.data!.profile;
  },
};

export const resumeService = {
  async uploadAndAnalyze(file: File, targetRole?: string) {
    const formData = new FormData();
    formData.append('resume', file);
    if (targetRole) formData.append('targetRole', targetRole);
    const res = await apiClient.post<ResumeAnalysis>('/resume/analyze', formData);
    return res.data!;
  },

  async getAll() {
    const res = await apiClient.get<{ analyses: ResumeAnalysis[] }>('/resume');
    return res.data!.analyses;
  },

  async getOne(id: string) {
    const res = await apiClient.get<{ analysis: ResumeAnalysis }>(`/resume/${id}`);
    return res.data!.analysis;
  },
};

export const analyticsService = {
  async getDashboard() {
    const res = await apiClient.get<{ dashboard: DashboardData }>('/analytics/dashboard');
    return res.data!.dashboard;
  },

  async computeScore() {
    const res = await apiClient.post<{ score: DevScore }>('/analytics/score/compute');
    return res.data!.score;
  },

  async getScoreTrend(days?: number) {
    const params = days ? `?days=${days}` : '';
    const res = await apiClient.get<{ trend: ScoreTrend[] }>(`/analytics/score/trend${params}`);
    return res.data!.trend;
  },

  async getSkills() {
    const res = await apiClient.get<{ skills: { name: string; category: string; proficiency_level: number; source: string }[] }>('/analytics/skills');
    return res.data!.skills;
  },

  async createTarget(data: { role_title: string; required_skills: string[]; preferred_skills?: string[] }) {
    const res = await apiClient.post<{ target: CareerTarget }>('/analytics/targets', data);
    return res.data!.target;
  },

  async getTargets() {
    const res = await apiClient.get<{ targets: CareerTarget[] }>('/analytics/targets');
    return res.data!.targets;
  },
};

export const usersService = {
  async getProfile() {
    const res = await apiClient.get<{ profile: any }>('/users/me');
    return res.data!.profile;
  },

  async getStats() {
    const res = await apiClient.get<{ stats: UserStats }>('/users/me/stats');
    return res.data!.stats;
  },

  async updateProfile(data: { display_name?: string; bio?: string; location?: string }) {
    const res = await apiClient.patch<{ profile: any }>('/users/me', data);
    return res.data!.profile;
  },
};
