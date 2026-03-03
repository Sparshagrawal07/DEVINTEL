export interface OnboardingStatus {
  step: number;
  isComplete: boolean;
  data: {
    username: string;
    hasPassword: boolean;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    links: UserLink[];
    education: Education[];
    skills: string[];
  };
}

export interface UserLink {
  id?: string;
  link_type: string;
  url: string;
  label?: string;
}

export interface Education {
  id?: string;
  degree: string;
  institution: string;
  field_of_study?: string;
  start_year: number;
  end_year?: number;
  is_current?: boolean;
  description?: string;
}

export interface StepUsernameDTO { username: string }
export interface StepPasswordDTO { password: string }
export interface StepProfileDTO { display_name: string; avatar_url?: string }
export interface StepBioDTO { bio: string }
export interface StepLinksDTO { links: UserLink[] }
export interface StepEducationDTO { education: Education[] }
export interface StepSkillsDTO { skills: string[] }
