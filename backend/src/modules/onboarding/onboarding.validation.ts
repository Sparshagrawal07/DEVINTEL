import { z } from 'zod';

export const stepUsernameSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores')
    .transform((v) => v.toLowerCase()),
});

export const stepPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const stepProfileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(128),
  avatar_url: z.string().url().optional().or(z.literal('')),
});

export const stepBioSchema = z.object({
  bio: z.string().min(1, 'Bio is required').max(500, 'Bio must be at most 500 characters'),
});

const linkSchema = z.object({
  link_type: z.enum(['leetcode', 'linkedin', 'portfolio', 'twitter', 'github', 'blog', 'other']),
  url: z.string().url('Must be a valid URL'),
  label: z.string().max(128).optional(),
});

export const stepLinksSchema = z.object({
  links: z.array(linkSchema).max(10, 'Maximum 10 links'),
});

const educationSchema = z.object({
  degree: z.string().min(1).max(128),
  institution: z.string().min(1).max(256),
  field_of_study: z.string().max(256).optional(),
  start_year: z.number().int().min(1950).max(2030),
  end_year: z.number().int().min(1950).max(2035).optional(),
  is_current: z.boolean().optional(),
  description: z.string().max(1000).optional(),
});

export const stepEducationSchema = z.object({
  education: z.array(educationSchema).max(5, 'Maximum 5 education entries'),
});

export const stepSkillsSchema = z.object({
  skills: z.array(z.string().min(1).max(64)).min(1, 'Add at least one skill').max(30, 'Maximum 30 skills'),
});
