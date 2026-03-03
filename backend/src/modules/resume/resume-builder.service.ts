import { query, queryOne } from '../../config/database';
import type { UserLink, Education } from '../onboarding/onboarding.types';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../config/logger';

interface UserProfileData {
  display_name: string | null;
  username: string;
  email: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
}

interface ProjectData {
  id: string;
  title: string;
  description: string | null;
  tech_stack: string[];
  url: string | null;
  github_url: string | null;
  highlights: string[];
}

interface GitHubStats {
  totalRepos: number;
  totalCommits: number;
  totalPRs: number;
  topLanguages: string[];
  topRepos: Array<{ name: string; description: string | null; stars: number; language: string | null; url: string }>;
}

interface LeetCodeStats {
  username: string | null;
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  ranking: number | null;
}

interface GeneratedResume {
  id: string;
  user_id: string;
  template: string;
  markdown_content: string;
  included_sections: Record<string, boolean>;
  data_snapshot: Record<string, any>;
  created_at: Date;
}

export class ResumeBuilderService {
  /**
   * Aggregate all user data and generate a markdown resume.
   */
  async generate(
    userId: string,
    sections: Record<string, boolean> = {},
    template: string = 'minimal'
  ): Promise<GeneratedResume> {
    // Gather all data in parallel
    const [profile, education, links, skills, projects, github, leetcode] = await Promise.all([
      this.getUserProfile(userId),
      this.getEducation(userId),
      this.getUserLinks(userId),
      this.getSkills(userId),
      this.getProjects(userId),
      this.getGitHubStats(userId),
      this.getLeetCodeStats(userId),
    ]);

    if (!profile) throw new NotFoundError('User profile');

    // Default all sections to true
    const defaultSections: Record<string, boolean> = {
      header: true,
      bio: true,
      links: true,
      skills: true,
      education: true,
      projects: true,
      github: true,
      leetcode: true,
    };
    const activeSections = { ...defaultSections, ...sections };

    const markdown = this.buildMarkdown(
      activeSections,
      profile, education, links, skills, projects, github, leetcode
    );

    // Store generated resume
    const snapshot = { profile, education, links, skills, projects, github, leetcode };
    const result = await queryOne<GeneratedResume>(
      `INSERT INTO generated_resumes (user_id, template, markdown_content, included_sections, data_snapshot)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, template, markdown, JSON.stringify(activeSections), JSON.stringify(snapshot)]
    );

    return result!;
  }

  async getHistory(userId: string): Promise<GeneratedResume[]> {
    return query<GeneratedResume>(
      'SELECT id, user_id, template, included_sections, created_at FROM generated_resumes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
  }

  async getById(userId: string, resumeId: string): Promise<GeneratedResume | null> {
    return queryOne<GeneratedResume>(
      'SELECT * FROM generated_resumes WHERE id = $1 AND user_id = $2',
      [resumeId, userId]
    );
  }

  // --------------------------------------------------
  // Data gathering helpers
  // --------------------------------------------------

  private async getUserProfile(userId: string): Promise<UserProfileData | null> {
    return queryOne<UserProfileData>(
      'SELECT display_name, username, email, bio, location, avatar_url FROM users WHERE id = $1',
      [userId]
    );
  }

  private async getEducation(userId: string): Promise<Education[]> {
    return query<Education>(
      'SELECT degree, institution, field_of_study, start_year, end_year, is_current, description FROM education WHERE user_id = $1 ORDER BY start_year DESC',
      [userId]
    );
  }

  private async getUserLinks(userId: string): Promise<UserLink[]> {
    return query<UserLink>(
      'SELECT link_type, url, label FROM user_links WHERE user_id = $1',
      [userId]
    );
  }

  private async getSkills(userId: string): Promise<string[]> {
    const rows = await query<{ name: string }>(
      'SELECT DISTINCT name FROM skills WHERE user_id = $1 ORDER BY name',
      [userId]
    );
    return rows.map((r) => r.name);
  }

  private async getProjects(userId: string): Promise<ProjectData[]> {
    return query<ProjectData>(
      'SELECT id, title, description, tech_stack, url, github_url, highlights FROM projects WHERE user_id = $1 ORDER BY sort_order ASC, created_at DESC',
      [userId]
    );
  }

  private async getGitHubStats(userId: string): Promise<GitHubStats | null> {
    try {
      const repoCount = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM repositories WHERE user_id = $1',
        [userId]
      );
      const commitCount = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM commits c JOIN repositories r ON r.id = c.repository_id WHERE r.user_id = $1',
        [userId]
      );
      const prCount = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM pull_requests pr JOIN repositories r ON r.id = pr.repository_id WHERE r.user_id = $1',
        [userId]
      );

      // Top repos by stars
      const topRepos = await query<{ name: string; description: string | null; stargazers_count: number; language: string | null; html_url: string }>(
        "SELECT name, description, stargazers_count, language, html_url FROM repositories WHERE user_id = $1 AND is_fork = false ORDER BY stargazers_count DESC LIMIT 5",
        [userId]
      );

      // Top languages
      const languages = await query<{ language: string; cnt: string }>(
        "SELECT language, COUNT(*) as cnt FROM repositories WHERE user_id = $1 AND language IS NOT NULL GROUP BY language ORDER BY cnt DESC LIMIT 8",
        [userId]
      );

      return {
        totalRepos: parseInt(repoCount?.count ?? '0', 10),
        totalCommits: parseInt(commitCount?.count ?? '0', 10),
        totalPRs: parseInt(prCount?.count ?? '0', 10),
        topLanguages: languages.map((l) => l.language),
        topRepos: topRepos.map((r) => ({
          name: r.name,
          description: r.description,
          stars: r.stargazers_count,
          language: r.language,
          url: r.html_url,
        })),
      };
    } catch (err) {
      logger.warn('Failed to fetch GitHub stats for resume', err);
      return null;
    }
  }

  private async getLeetCodeStats(userId: string): Promise<LeetCodeStats | null> {
    try {
      return queryOne<LeetCodeStats>(
        'SELECT username, total_solved, easy_solved, medium_solved, hard_solved, ranking FROM leetcode_profiles WHERE user_id = $1',
        [userId]
      );
    } catch {
      return null;
    }
  }

  // --------------------------------------------------
  // Markdown builder
  // --------------------------------------------------

  private buildMarkdown(
    sections: Record<string, boolean>,
    profile: UserProfileData,
    education: Education[],
    links: UserLink[],
    skills: string[],
    projects: ProjectData[],
    github: GitHubStats | null,
    leetcode: LeetCodeStats | null
  ): string {
    const lines: string[] = [];

    // Header
    if (sections.header) {
      const name = profile.display_name || profile.username;
      lines.push(`# ${name}`);
      if (profile.location) lines.push(`**${profile.location}**`);
      lines.push(`${profile.email}`);
      lines.push('');
    }

    // Bio
    if (sections.bio && profile.bio) {
      lines.push('## About');
      lines.push(profile.bio);
      lines.push('');
    }

    // Links
    if (sections.links && links.length > 0) {
      lines.push('## Links');
      for (const link of links) {
        const label = link.label || link.link_type.charAt(0).toUpperCase() + link.link_type.slice(1);
        lines.push(`- **${label}**: ${link.url}`);
      }
      lines.push('');
    }

    // Skills
    if (sections.skills && skills.length > 0) {
      lines.push('## Skills');
      lines.push(skills.join(' · '));
      lines.push('');
    }

    // Education
    if (sections.education && education.length > 0) {
      lines.push('## Education');
      for (const edu of education) {
        const years = edu.is_current
          ? `${edu.start_year} – Present`
          : `${edu.start_year} – ${edu.end_year ?? ''}`;
        lines.push(`### ${edu.degree}${edu.field_of_study ? ` in ${edu.field_of_study}` : ''}`);
        lines.push(`**${edu.institution}** | ${years}`);
        if (edu.description) lines.push(edu.description);
        lines.push('');
      }
    }

    // Projects
    if (sections.projects && projects.length > 0) {
      lines.push('## Projects');
      for (const proj of projects) {
        lines.push(`### ${proj.title}`);
        if (proj.description) lines.push(proj.description);
        if (proj.tech_stack?.length > 0) lines.push(`**Tech:** ${proj.tech_stack.join(', ')}`);
        if (proj.url) lines.push(`[Live](${proj.url})`);
        if (proj.github_url) lines.push(`[Source](${proj.github_url})`);
        if (proj.highlights?.length > 0) {
          for (const h of proj.highlights) lines.push(`- ${h}`);
        }
        lines.push('');
      }
    }

    // GitHub
    if (sections.github && github && github.totalRepos > 0) {
      lines.push('## GitHub Activity');
      lines.push(`**${github.totalRepos}** repositories · **${github.totalCommits}** commits · **${github.totalPRs}** pull requests`);
      if (github.topLanguages.length > 0) {
        lines.push(`**Languages:** ${github.topLanguages.join(', ')}`);
      }
      if (github.topRepos.length > 0) {
        lines.push('');
        lines.push('**Top Repositories:**');
        for (const repo of github.topRepos) {
          const desc = repo.description ? ` — ${repo.description}` : '';
          const stars = repo.stars > 0 ? ` ⭐ ${repo.stars}` : '';
          lines.push(`- [${repo.name}](${repo.url})${desc}${stars}`);
        }
      }
      lines.push('');
    }

    // LeetCode
    if (sections.leetcode && leetcode && leetcode.total_solved > 0) {
      lines.push('## LeetCode');
      lines.push(`**${leetcode.total_solved}** problems solved — Easy: ${leetcode.easy_solved} · Medium: ${leetcode.medium_solved} · Hard: ${leetcode.hard_solved}`);
      if (leetcode.ranking) lines.push(`Ranking: #${leetcode.ranking.toLocaleString()}`);
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push(`*Generated by DevIntel on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*`);

    return lines.join('\n');
  }
}
