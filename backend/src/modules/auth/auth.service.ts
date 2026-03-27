import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getEnv } from '../../config/env';
import { AuthRepository } from './auth.repository';
import {
  LoginDTO,
  RegisterDTO,
  TokenPair,
  User,
  GitHubProfile,
  GitHubTokenResponse,
} from './auth.types';
import {
  UnauthorizedError,
  ConflictError,
  BadRequestError,
} from '../../utils/errors';
import { JwtPayload } from '../../middleware/auth.middleware';

export class AuthService {
  constructor(private readonly authRepo: AuthRepository) {}

  private readonly oauthRequestTimeoutMs = 10000;
  private readonly oauthMaxRetries = 2;

  async register(dto: RegisterDTO): Promise<{ user: Omit<User, 'password_hash'>; tokens: TokenPair }> {
    const existingEmail = await this.authRepo.findUserByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }

    const existingUsername = await this.authRepo.findUserByUsername(dto.username);
    if (existingUsername) {
      throw new ConflictError('Username already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.authRepo.createUser({
      email: dto.email,
      username: dto.username,
      password_hash: passwordHash,
      display_name: dto.display_name,
    });

    const tokens = await this.generateTokens(user);
    const { password_hash, ...safeUser } = user;

    return { user: safeUser, tokens };
  }

  async login(dto: LoginDTO): Promise<{ user: Omit<User, 'password_hash'>; tokens: TokenPair }> {
    const user = await this.authRepo.findUserByEmail(dto.email);
    if (!user || !user.password_hash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('Account is deactivated');
    }

    await this.authRepo.updateLastLogin(user.id);
    const tokens = await this.generateTokens(user);
    const { password_hash, ...safeUser } = user;

    return { user: safeUser, tokens };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.authRepo.findRefreshToken(tokenHash);

    if (!stored) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    await this.authRepo.revokeRefreshToken(tokenHash);

    const user = await this.authRepo.findUserById(stored.user_id);
    if (!user || !user.is_active) {
      throw new UnauthorizedError('User not found or deactivated');
    }

    return this.generateTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.authRepo.revokeRefreshToken(tokenHash);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.authRepo.revokeAllUserTokens(userId);
  }

  // GitHub OAuth
  getGitHubAuthUrl(): string {
    const env = getEnv();
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: 'read:user user:email repo',
      state: crypto.randomBytes(16).toString('hex'),
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async handleGitHubCallback(code: string): Promise<{ user: Omit<User, 'password_hash'>; tokens: TokenPair; isNewUser: boolean }> {
    const accessToken = await this.exchangeGitHubCode(code);
    const profile = await this.fetchGitHubProfile(accessToken);

    if (!profile.email) {
      const emails = await this.fetchGitHubEmails(accessToken);
      const primary = emails.find((e: any) => e.primary && e.verified);
      if (primary) {
        profile.email = primary.email;
      } else {
        throw new BadRequestError('No verified email found on GitHub account');
      }
    }

    // Check if OAuth account exists
    const existingOAuth = await this.authRepo.findOAuthAccount('github', String(profile.id));
    let user: User;
    let isNewUser = false;

    if (existingOAuth) {
      // Update token
      await this.authRepo.updateOAuthToken(existingOAuth.id, accessToken);
      user = (await this.authRepo.findUserById(existingOAuth.user_id))!;
    } else {
      // Check if user with same email exists
      const existingUser = await this.authRepo.findUserByEmail(profile.email!);

      if (existingUser) {
        user = existingUser;
      } else {
        // Create new user
        let username = profile.login;
        const existing = await this.authRepo.findUserByUsername(username);
        if (existing) {
          username = `${profile.login}-${crypto.randomBytes(3).toString('hex')}`;
        }

        user = await this.authRepo.createUser({
          email: profile.email!,
          username,
          display_name: profile.name ?? profile.login,
          avatar_url: profile.avatar_url,
          bio: profile.bio ?? undefined,
          location: profile.location ?? undefined,
          is_email_verified: true,
        });
        isNewUser = true;
      }

      // Link OAuth account
      await this.authRepo.createOAuthAccount({
        user_id: user.id,
        provider: 'github',
        provider_user_id: String(profile.id),
        access_token: accessToken,
        provider_username: profile.login,
        provider_email: profile.email ?? undefined,
        provider_avatar_url: profile.avatar_url,
        raw_profile: profile as any,
      });
    }

    await this.authRepo.updateLastLogin(user.id);
    const tokens = await this.generateTokens(user);
    const { password_hash, ...safeUser } = user;

    return { user: safeUser, tokens, isNewUser };
  }

  // Token helpers
  private async generateTokens(user: User): Promise<TokenPair> {
    const env = getEnv();

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY as any,
    });

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.authRepo.createRefreshToken({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async exchangeGitHubCode(code: string): Promise<string> {
    const env = getEnv();

    const response = await this.fetchWithRetry(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: env.GITHUB_CALLBACK_URL,
        }),
      },
      'GitHub token exchange'
    );

    const data = (await response.json()) as GitHubTokenResponse;

    if (!data.access_token) {
      if (data.error) {
        throw new BadRequestError(`GitHub OAuth failed: ${data.error_description || data.error}`);
      }
      throw new BadRequestError('Failed to exchange GitHub code for token');
    }

    return data.access_token;
  }

  private async fetchGitHubProfile(accessToken: string): Promise<GitHubProfile> {
    const response = await this.fetchWithRetry(
      'https://api.github.com/user',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      },
      'GitHub profile fetch'
    );

    if (!response.ok) {
      throw new BadRequestError('Failed to fetch GitHub profile');
    }

    return (await response.json()) as GitHubProfile;
  }

  private async fetchGitHubEmails(accessToken: string): Promise<any[]> {
    const response = await this.fetchWithRetry(
      'https://api.github.com/user/emails',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      },
      'GitHub email fetch'
    );

    if (!response.ok) return [];
    return (await response.json()) as any[];
  }

  private async fetchWithRetry(url: string, init: RequestInit, operationName: string): Promise<Response> {
    for (let attempt = 1; attempt <= this.oauthMaxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.oauthRequestTimeoutMs);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });

        if (!response.ok && response.status >= 500 && attempt < this.oauthMaxRetries) {
          continue;
        }

        return response;
      } catch (error) {
        if (attempt >= this.oauthMaxRetries) {
          break;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new BadRequestError(`${operationName} failed. Please try again.`);
  }
}
