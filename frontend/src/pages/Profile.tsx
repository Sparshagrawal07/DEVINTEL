import { useState, useEffect } from 'react';
import { Card, Avatar, Badge, Skeleton } from '../components/primitives';
import { useToast } from '../components/primitives';
import { useAuthStore } from '../context/auth.store';
import { usersService, analyticsService } from '../services/data.service';
import type { UserStats, CareerTarget } from '../types';

export function ProfilePage() {
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [targets, setTargets] = useState<CareerTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<{ name: string; category: string; proficiency_level: number }[]>([]);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [st, tg, sk] = await Promise.allSettled([usersService.getStats(), analyticsService.getTargets(), analyticsService.getSkills()]);
      if (st.status === 'fulfilled') setStats(st.value);
      if (tg.status === 'fulfilled') setTargets(tg.value);
      if (sk.status === 'fulfilled') setSkills(sk.value);
    } catch { addToast('Failed to load profile', 'error'); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="flex items-center gap-6">
          <Skeleton width="64px" height="64px" />
          <div className="space-y-2"><Skeleton width="160px" height="20px" /><Skeleton width="120px" height="14px" /></div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><Skeleton height="200px" /></Card>
          <Card><Skeleton height="200px" /></Card>
        </div>
      </div>
    );
  }

  const skillsByCategory = skills.reduce<Record<string, typeof skills>>((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-mono font-bold text-nothing-white tracking-tight">PROFILE</h1>

      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar src={user?.avatar_url} name={user?.display_name || user?.username} size="xl" />
          <div className="flex-1">
            <h2 className="text-lg font-mono font-bold text-nothing-white">{user?.display_name || user?.username}</h2>
            <p className="text-xs font-mono text-nothing-grey-500">@{user?.username}</p>
            {user?.bio && <p className="text-xs font-mono text-nothing-grey-400 mt-2">{user.bio}</p>}
            {user?.location && (
              <p className="text-[10px] font-mono text-nothing-grey-600 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {user.location}
              </p>
            )}
          </div>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {[
                { label: 'Repos', value: stats.total_repos },
                { label: 'Commits', value: stats.total_commits },
                { label: 'LC Solved', value: stats.leetcode_solved ?? '\u2014' },
                { label: 'DevScore', value: stats.latest_dev_score != null ? Number(stats.latest_dev_score).toFixed(0) : '\u2014' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-lg font-mono font-bold text-nothing-white">{s.value}</p>
                  <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-4">Skills</h3>
          {Object.keys(skillsByCategory).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(skillsByCategory).map(([category, catSkills]) => (
                <div key={category}>
                  <h4 className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-600 mb-2">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {catSkills.map((skill) => (<Badge key={skill.name}>{skill.name}</Badge>))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-mono text-nothing-grey-500">No skills detected yet. Sync GitHub or upload a resume.</p>
          )}
        </Card>

        <Card>
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-4">Career Targets</h3>
          {targets.length > 0 ? (
            <div className="space-y-4">
              {targets.map((target) => (
                <div key={target.id} className="p-3 border border-nothing-grey-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-mono text-nothing-white">{target.role_title}</h4>
                    <Badge variant={target.is_active ? 'success' : 'default'}>{target.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {target.required_skills.slice(0, 6).map((skill: string) => (<Badge key={skill} size="sm">{skill}</Badge>))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-mono text-nothing-grey-500">No career targets set. Add one from Settings.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
