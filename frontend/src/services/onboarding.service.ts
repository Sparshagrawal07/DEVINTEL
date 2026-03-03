import { apiClient } from './api';
import type { OnboardingStatus, GeneratedResume } from '../types';

export const onboardingService = {
  async getStatus() {
    const res = await apiClient.get<OnboardingStatus>('/onboarding/status');
    return res.data!;
  },

  async checkUsername(username: string) {
    const res = await apiClient.get<{ available: boolean }>(`/onboarding/check-username/${encodeURIComponent(username)}`);
    return res.data!.available;
  },

  async stepUsername(username: string) {
    await apiClient.post('/onboarding/step/username', { username });
  },

  async stepPassword(password: string) {
    await apiClient.post('/onboarding/step/password', { password });
  },

  async stepProfile(display_name: string, avatar_url?: string) {
    await apiClient.post('/onboarding/step/profile', { display_name, avatar_url });
  },

  async stepBio(bio: string) {
    await apiClient.post('/onboarding/step/bio', { bio });
  },

  async stepLinks(links: Array<{ link_type: string; url: string; label?: string }>) {
    await apiClient.post('/onboarding/step/links', { links });
  },

  async stepEducation(education: Array<{
    degree: string;
    institution: string;
    field_of_study?: string;
    start_year: number;
    end_year?: number;
    is_current?: boolean;
    description?: string;
  }>) {
    await apiClient.post('/onboarding/step/education', { education });
  },

  async stepSkills(skills: string[]) {
    await apiClient.post('/onboarding/step/skills', { skills });
  },

  async complete() {
    await apiClient.post('/onboarding/complete');
  },
};

export const resumeBuilderService = {
  async generate(sections?: Record<string, boolean>, template?: string) {
    const res = await apiClient.post<GeneratedResume>('/resume/generate', { sections, template });
    return res.data!;
  },

  async getHistory() {
    const res = await apiClient.get<GeneratedResume[]>('/resume/generated');
    return res.data!;
  },

  async getById(id: string) {
    const res = await apiClient.get<GeneratedResume>(`/resume/generated/${id}`);
    return res.data!;
  },
};
