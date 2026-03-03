import bcrypt from 'bcryptjs';
import { OnboardingRepository } from './onboarding.repository';
import type {
  OnboardingStatus,
  StepUsernameDTO,
  StepPasswordDTO,
  StepProfileDTO,
  StepBioDTO,
  StepLinksDTO,
  StepEducationDTO,
  StepSkillsDTO,
} from './onboarding.types';
import { ConflictError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { sanitizeInput } from '../../utils/helpers';

export class OnboardingService {
  constructor(private readonly repo: OnboardingRepository) {}

  async getStatus(userId: string): Promise<OnboardingStatus> {
    const user = await this.repo.getUserOnboardingData(userId);
    if (!user) throw new BadRequestError('User not found');

    const [links, education, skills] = await Promise.all([
      this.repo.getUserLinks(userId),
      this.repo.getUserEducation(userId),
      this.repo.getManualSkills(userId),
    ]);

    return {
      step: user.onboarding_step,
      isComplete: user.is_onboarded,
      data: {
        username: user.username,
        hasPassword: !!user.password_hash,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        links,
        education,
        skills,
      },
    };
  }

  async stepUsername(userId: string, dto: StepUsernameDTO): Promise<void> {
    const taken = await this.repo.isUsernameTaken(dto.username, userId);
    if (taken) throw new ConflictError('Username is already taken');

    await this.repo.updateUsername(userId, sanitizeInput(dto.username));
    await this.advanceStep(userId, 1);
  }

  async stepPassword(userId: string, dto: StepPasswordDTO): Promise<void> {
    const hash = await bcrypt.hash(dto.password, 12);
    await this.repo.updatePasswordHash(userId, hash);
    await this.advanceStep(userId, 2);
  }

  async stepProfile(userId: string, dto: StepProfileDTO): Promise<void> {
    await this.repo.updateProfile(userId, sanitizeInput(dto.display_name), dto.avatar_url);
    await this.advanceStep(userId, 3);
  }

  async stepBio(userId: string, dto: StepBioDTO): Promise<void> {
    await this.repo.updateBio(userId, sanitizeInput(dto.bio));
    await this.advanceStep(userId, 4);
  }

  async stepLinks(userId: string, dto: StepLinksDTO): Promise<void> {
    await this.repo.replaceUserLinks(userId, dto.links);
    await this.advanceStep(userId, 5);
  }

  async stepEducation(userId: string, dto: StepEducationDTO): Promise<void> {
    await this.repo.replaceEducation(userId, dto.education);
    await this.advanceStep(userId, 6);
  }

  async stepSkills(userId: string, dto: StepSkillsDTO): Promise<void> {
    const sanitized = dto.skills.map((s) => sanitizeInput(s)).filter(Boolean);
    if (sanitized.length === 0) throw new BadRequestError('At least one skill is required');
    await this.repo.replaceManualSkills(userId, sanitized);
    await this.advanceStep(userId, 7);
  }

  async complete(userId: string): Promise<void> {
    const user = await this.repo.getUserOnboardingData(userId);
    if (!user) throw new BadRequestError('User not found');

    if (user.onboarding_step < 7) {
      throw new ForbiddenError('Complete all onboarding steps first');
    }

    await this.repo.completeOnboarding(userId);
  }

  async checkUsername(username: string, userId: string): Promise<{ available: boolean }> {
    const taken = await this.repo.isUsernameTaken(username, userId);
    return { available: !taken };
  }

  private async advanceStep(userId: string, minStep: number): Promise<void> {
    const user = await this.repo.getUserOnboardingData(userId);
    if (user && user.onboarding_step < minStep) {
      await this.repo.setOnboardingStep(userId, minStep);
    }
  }
}
