import { useState, type FormEvent } from 'react';
import { Card, Button, Input, Textarea } from '../components/primitives';
import { useToast } from '../components/primitives';
import { useAuthStore } from '../context/auth.store';
import { usersService, analyticsService } from '../services/data.service';
import { authService } from '../services/auth.service';

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

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <h1 className="text-xl font-mono font-bold text-nothing-white tracking-tight">SETTINGS</h1>

      <Card>
        <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-4">Profile</h3>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <Input label="Display Name" value={profile.display_name} onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))} placeholder="Your display name" />
          <Textarea label="Bio" value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." rows={3} />
          <Input label="Location" value={profile.location} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))} placeholder="San Francisco, CA" />
          <Button type="submit" variant="primary" isLoading={savingProfile}>Save Profile</Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-4">New Career Target</h3>
        <form onSubmit={handleTargetCreate} className="space-y-4">
          <Input label="Role Title" value={targetForm.role_title} onChange={(e) => setTargetForm((p) => ({ ...p, role_title: e.target.value }))} placeholder="e.g., Senior Full-Stack Engineer" required />
          <Input label="Required Skills" value={targetForm.required_skills} onChange={(e) => setTargetForm((p) => ({ ...p, required_skills: e.target.value }))} placeholder="React, Node.js, PostgreSQL" hint="Comma-separated" required />
          <Input label="Preferred Skills" value={targetForm.preferred_skills} onChange={(e) => setTargetForm((p) => ({ ...p, preferred_skills: e.target.value }))} placeholder="Docker, Kubernetes, AWS" hint="Comma-separated (optional)" />
          <Button type="submit" variant="primary" isLoading={savingTarget}>Create Target</Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-4">Integrations</h3>
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
      </Card>
    </div>
  );
}
