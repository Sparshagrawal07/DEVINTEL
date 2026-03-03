import { useState, useEffect, type FormEvent } from 'react';
import { Card, Button, Input, Textarea } from '../components/primitives';
import { useToast } from '../components/primitives';
import { useAuthStore } from '../context/auth.store';
import { usersService, analyticsService, leetcodeService } from '../services/data.service';
import { authService } from '../services/auth.service';
import type { LeetCodeProfile } from '../types';

export function SettingsPage() {
  const { user } = useAuthStore();
  const updateUser = useAuthStore((s) => s.updateUser);
  const { addToast } = useToast();

  const [profile, setProfile] = useState({
    display_name: user?.display_name || '',
    bio: user?.bio || '',
    location: user?.location || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [targetForm, setTargetForm] = useState({ role_title: '', required_skills: '', preferred_skills: '' });
  const [savingTarget, setSavingTarget] = useState(false);

  // LeetCode state
  const [lcUsername, setLcUsername] = useState('');
  const [lcProfile, setLcProfile] = useState<LeetCodeProfile | null>(null);
  const [lcLoading, setLcLoading] = useState(true);
  const [lcConnecting, setLcConnecting] = useState(false);
  const [lcSyncing, setLcSyncing] = useState(false);
  const [lcDisconnecting, setLcDisconnecting] = useState(false);

  useEffect(() => {
    loadLeetCodeProfile();
  }, []);

  const loadLeetCodeProfile = async () => {
    setLcLoading(true);
    try {
      const p = await leetcodeService.getProfile();
      setLcProfile(p);
    } catch {
      setLcProfile(null);
    } finally {
      setLcLoading(false);
    }
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await usersService.updateProfile(profile);
      updateUser(updated);
      addToast('Profile updated!', 'success');
    } catch { addToast('Failed to update profile', 'error'); }
    finally { setSavingProfile(false); }
  };

  const handleTargetCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!targetForm.role_title.trim() || !targetForm.required_skills.trim()) {
      addToast('Role title and required skills are needed', 'warning');
      return;
    }
    setSavingTarget(true);
    try {
      await analyticsService.createTarget({
        role_title: targetForm.role_title.trim(),
        required_skills: targetForm.required_skills.split(',').map((s) => s.trim()).filter(Boolean),
        preferred_skills: targetForm.preferred_skills ? targetForm.preferred_skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      });
      addToast('Career target created!', 'success');
      setTargetForm({ role_title: '', required_skills: '', preferred_skills: '' });
    } catch { addToast('Failed to create target', 'error'); }
    finally { setSavingTarget(false); }
  };

  const handleLcConnect = async (e: FormEvent) => {
    e.preventDefault();
    if (!lcUsername.trim()) {
      addToast('Enter your LeetCode username', 'warning');
      return;
    }
    setLcConnecting(true);
    try {
      await leetcodeService.connect(lcUsername.trim());
      addToast('LeetCode connected and synced!', 'success');
      setLcUsername('');
      await loadLeetCodeProfile();
    } catch (err: any) {
      addToast(err?.message || 'Failed to connect LeetCode', 'error');
    } finally {
      setLcConnecting(false);
    }
  };

  const handleLcSync = async () => {
    setLcSyncing(true);
    try {
      await leetcodeService.sync();
      addToast('LeetCode data synced!', 'success');
      await loadLeetCodeProfile();
    } catch {
      addToast('Failed to sync LeetCode', 'error');
    } finally {
      setLcSyncing(false);
    }
  };

  const handleLcDisconnect = async () => {
    setLcDisconnecting(true);
    try {
      await leetcodeService.disconnect();
      setLcProfile(null);
      addToast('LeetCode disconnected', 'success');
    } catch {
      addToast('Failed to disconnect LeetCode', 'error');
    } finally {
      setLcDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <h1 className="text-xl font-mono font-bold text-nothing-white tracking-tight">SETTINGS</h1>

      {/* Profile Section */}
      <Card>
        <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-4">Profile</h3>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <Input label="Display Name" value={profile.display_name} onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))} placeholder="Your display name" />
          <Textarea label="Bio" value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." rows={3} />
          <Input label="Location" value={profile.location} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))} placeholder="San Francisco, CA" />
          <Button type="submit" variant="primary" isLoading={savingProfile}>Save Profile</Button>
        </form>
      </Card>

      {/* Career Target Section */}
      <Card>
        <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-4">New Career Target</h3>
        <form onSubmit={handleTargetCreate} className="space-y-4">
          <Input label="Role Title" value={targetForm.role_title} onChange={(e) => setTargetForm((p) => ({ ...p, role_title: e.target.value }))} placeholder="e.g., Senior Full-Stack Engineer" required />
          <Input label="Required Skills" value={targetForm.required_skills} onChange={(e) => setTargetForm((p) => ({ ...p, required_skills: e.target.value }))} placeholder="React, Node.js, PostgreSQL" hint="Comma-separated" required />
          <Input label="Preferred Skills" value={targetForm.preferred_skills} onChange={(e) => setTargetForm((p) => ({ ...p, preferred_skills: e.target.value }))} placeholder="Docker, Kubernetes, AWS" hint="Comma-separated (optional)" />
          <Button type="submit" variant="primary" isLoading={savingTarget}>Create Target</Button>
        </form>
      </Card>

      {/* Integrations Section */}
      <Card>
        <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-4">Integrations</h3>
        <div className="space-y-3">
          {/* GitHub Integration */}
          <div className="flex items-center justify-between p-3 border border-nothing-grey-800">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-nothing-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              <div>
                <p className="text-xs font-mono text-nothing-white">GitHub</p>
                <p className="text-[10px] font-mono text-nothing-grey-600">Connected via OAuth</p>
              </div>
            </div>
            <a href={authService.getGitHubAuthUrl()} className="text-xs font-mono text-nothing-grey-400 hover:text-nothing-white transition-colors">Reconnect</a>
          </div>

          {/* LeetCode Integration */}
          <div className="p-3 border border-nothing-grey-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-nothing-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
                </svg>
                <div>
                  <p className="text-xs font-mono text-nothing-white">LeetCode</p>
                  {lcLoading ? (
                    <p className="text-[10px] font-mono text-nothing-grey-600">Loading...</p>
                  ) : lcProfile ? (
                    <p className="text-[10px] font-mono text-nothing-grey-600">
                      Connected as <span className="text-nothing-grey-400">{lcProfile.leetcode_username}</span>
                      {' '}&middot; {lcProfile.total_solved} solved
                    </p>
                  ) : (
                    <p className="text-[10px] font-mono text-nothing-grey-600">Not connected</p>
                  )}
                </div>
              </div>
              {lcProfile && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleLcSync} isLoading={lcSyncing}>Sync</Button>
                  <Button variant="ghost" size="sm" onClick={handleLcDisconnect} isLoading={lcDisconnecting}>Disconnect</Button>
                </div>
              )}
            </div>

            {!lcProfile && !lcLoading && (
              <form onSubmit={handleLcConnect} className="mt-3 flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="LeetCode Username"
                    value={lcUsername}
                    onChange={(e) => setLcUsername(e.target.value)}
                    placeholder="e.g., johndoe"
                  />
                </div>
                <Button type="submit" variant="primary" size="sm" isLoading={lcConnecting} className="mb-0.5">Connect</Button>
              </form>
            )}

            {lcProfile && (
              <div className="mt-3 grid grid-cols-4 gap-3">
                <div className="text-center p-2 border border-nothing-grey-800/50">
                  <p className="text-sm font-mono font-bold text-nothing-white">{lcProfile.total_solved}</p>
                  <p className="text-[9px] font-mono text-nothing-grey-600 uppercase">Total</p>
                </div>
                <div className="text-center p-2 border border-nothing-grey-800/50">
                  <p className="text-sm font-mono font-bold text-[#00b8a3]">{lcProfile.easy_solved}</p>
                  <p className="text-[9px] font-mono text-nothing-grey-600 uppercase">Easy</p>
                </div>
                <div className="text-center p-2 border border-nothing-grey-800/50">
                  <p className="text-sm font-mono font-bold text-[#ffc01e]">{lcProfile.medium_solved}</p>
                  <p className="text-[9px] font-mono text-nothing-grey-600 uppercase">Medium</p>
                </div>
                <div className="text-center p-2 border border-nothing-grey-800/50">
                  <p className="text-sm font-mono font-bold text-nothing-red">{lcProfile.hard_solved}</p>
                  <p className="text-[9px] font-mono text-nothing-grey-600 uppercase">Hard</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
