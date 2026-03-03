export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  is_onboarded: boolean;
  onboarding_step: number;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface OAuthAccount {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: Date | null;
  provider_username: string | null;
  provider_email: string | null;
  provider_avatar_url: string | null;
  raw_profile: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  device_info: string | null;
  ip_address: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  username: string;
  password: string;
  display_name?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface GitHubProfile {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}
