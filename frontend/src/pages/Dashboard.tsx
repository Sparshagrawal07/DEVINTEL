import { useEffect, useState } from 'react';
import { Card, Badge, Skeleton, Button } from '../components/primitives';
import { useToast } from '../components/primitives';
import { RadarChart, LineChart, ActivityHeatmap, DonutChart } from '../components/charts';
import { analyticsService, githubService, usersService, leetcodeService } from '../services/data.service';
import type { DashboardData, IntelligenceMetrics, UserStats } from '../types';
import { clsx } from 'clsx';

function MetricCard({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="p-4 border border-nothing-grey-800 bg-nothing-grey-900/50 hover:border-nothing-grey-600 transition-colors duration-300">
      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500 mb-2">{label}</p>
      <p className="text-2xl font-mono font-bold text-nothing-white">
        {value}
        {suffix && <span className="text-xs text-nothing-grey-500 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

function ScoreBar({ label, score, index }: { label: string; score: number; index: number }) {
  return (
    <div className={clsx('animate-slideUp', `stagger-${Math.min(index + 1, 5)}`)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-400">{label}</span>
        <span className="text-xs font-mono text-nothing-white">{Number(score).toFixed(0)}</span>
      </div>
      <div className="h-[3px] bg-nothing-grey-800 overflow-hidden">
        <div
          className="h-full bg-nothing-red transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(Number(score), 100)}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [_metrics, setMetrics] = useState<IntelligenceMetrics | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dash, met, st] = await Promise.allSettled([
        analyticsService.getDashboard(),
        githubService.getMetrics(),
        usersService.getStats(),
      ]);
      if (dash.status === 'fulfilled') setDashboard(dash.value);
      if (met.status === 'fulfilled') setMetrics(met.value);
      if (st.status === 'fulfilled') setStats(st.value);
    } catch {
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await githubService.syncAll();
      // Also sync LeetCode if connected
      try { await leetcodeService.sync(); } catch { /* not connected */ }
      addToast(`Synced ${result.repositories} repos, ${result.commits} commits, ${result.pullRequests} PRs`, 'success');
      await loadData();
    } catch {
      addToast('Sync failed. Check your GitHub connection.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleComputeScore = async () => {
    try {
      await analyticsService.computeScore();
      addToast('DevScore recalculated!', 'success');
      await loadData();
    } catch {
      addToast('Score computation failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Skeleton width="200px" height="28px" />
          <Skeleton width="120px" height="36px" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-nothing-grey-800 p-4"><Skeleton height="48px" /></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-nothing-grey-800 p-6"><Skeleton height="280px" /></div>
          <div className="border border-nothing-grey-800 p-6"><Skeleton height="280px" /></div>
        </div>
      </div>
    );
  }

  const currentScore = dashboard?.currentScore;
  const langColors = ['#d71921', '#fafafa', '#737373', '#525252', '#404040', '#a3a3a3'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-mono font-bold text-nothing-white tracking-tight">DASHBOARD</h1>
          <p className="text-[11px] font-mono text-nothing-grey-500 mt-1 tracking-wide">Developer intelligence overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleComputeScore}>Recalculate</Button>
          <Button variant="primary" size="sm" onClick={handleSync} isLoading={syncing}>Sync GitHub</Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Repos" value={stats.total_repos} />
          <MetricCard label="Commits" value={stats.total_commits.toLocaleString()} />
          <MetricCard label="Pull Requests" value={stats.total_prs} />
          <MetricCard label="LC Solved" value={dashboard?.leetcode?.totalSolved ?? '\u2014'} />
          <MetricCard label="DevScore" value={stats.latest_dev_score != null ? Number(stats.latest_dev_score).toFixed(0) : '\u2014'} suffix="/100" />
          <MetricCard label="LC Rating" value={dashboard?.leetcode?.contestRating ? Math.round(dashboard.leetcode.contestRating).toString() : '\u2014'} />
        </div>
      )}

      {currentScore && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400">Score Breakdown</h3>
            <Badge>{Number(currentScore.composite_score).toFixed(1)}</Badge>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Consistency', score: currentScore.consistency_score },
              { label: 'Technical Depth', score: currentScore.technical_depth_score },
              { label: 'Collaboration', score: currentScore.collaboration_score },
              { label: 'Skill Relevance', score: currentScore.skill_relevance_score },
              { label: 'Growth Velocity', score: currentScore.growth_velocity_score },
            ].map((item, i) => (
              <ScoreBar key={item.label} label={item.label} score={item.score} index={i} />
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-6">Composite Radar</h3>
          {currentScore ? (
            <div className="flex items-center justify-center py-4">
              <RadarChart
                data={[
                  { label: 'Consistency', value: Number(currentScore.consistency_score) },
                  { label: 'Depth', value: Number(currentScore.technical_depth_score) },
                  { label: 'Collab', value: Number(currentScore.collaboration_score) },
                  { label: 'Relevance', value: Number(currentScore.skill_relevance_score) },
                  { label: 'Growth', value: Number(currentScore.growth_velocity_score) },
                ]}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-nothing-grey-500">
              <p className="text-xs font-mono">No score data yet</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={handleComputeScore}>Compute Now</Button>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-6">Score Trend</h3>
          {dashboard?.scoreTrend && dashboard.scoreTrend.length > 1 ? (
            <LineChart
              data={dashboard.scoreTrend.map((t: { date: string; composite_score: number }) => ({
                label: new Date(t.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                value: t.composite_score,
              }))}
              height={260}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-nothing-grey-500 text-xs font-mono">
              Not enough data points for a trend
            </div>
          )}
        </Card>
      </div>

      {/* LeetCode Stats */}
      {dashboard?.leetcode?.connected && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400">LeetCode</h3>
            <Badge>{dashboard.leetcode.username}</Badge>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <DonutChart
              data={[
                { label: 'Easy', value: dashboard.leetcode.easySolved, color: '#00b8a3' },
                { label: 'Medium', value: dashboard.leetcode.mediumSolved, color: '#ffc01e' },
                { label: 'Hard', value: dashboard.leetcode.hardSolved, color: '#d71921' },
              ]}
              size={150} thickness={22}
              centerValue={dashboard.leetcode.totalSolved.toString()} centerLabel="SOLVED"
            />
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500">Easy</p>
                <p className="text-lg font-mono font-bold text-[#00b8a3]">{dashboard.leetcode.easySolved}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500">Medium</p>
                <p className="text-lg font-mono font-bold text-[#ffc01e]">{dashboard.leetcode.mediumSolved}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500">Hard</p>
                <p className="text-lg font-mono font-bold text-[#d71921]">{dashboard.leetcode.hardSolved}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500">Acceptance</p>
                <p className="text-lg font-mono font-bold text-nothing-white">{dashboard.leetcode.acceptanceRate?.toFixed(1) ?? '\u2014'}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500">Ranking</p>
                <p className="text-lg font-mono font-bold text-nothing-white">{dashboard.leetcode.ranking?.toLocaleString() ?? '\u2014'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500">Contests</p>
                <p className="text-lg font-mono font-bold text-nothing-white">{dashboard.leetcode.contestsAttended ?? 0}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-4">Activity</h3>
        <ActivityHeatmap data={dashboard?.activityHeatmap || []} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-6">Languages</h3>
          {dashboard?.topLanguages && dashboard.topLanguages.length > 0 ? (
            <div className="flex items-center gap-8">
              <DonutChart
                data={dashboard.topLanguages.slice(0, 6).map((l: { language: string; percentage: number }, i: number) => ({
                  label: l.language, value: l.percentage, color: langColors[i % langColors.length],
                }))}
                size={140} thickness={20}
                centerValue={dashboard.topLanguages.length.toString()} centerLabel="LANGS"
              />
              <div className="flex-1 space-y-3">
                {dashboard.topLanguages.slice(0, 6).map((lang: { language: string; percentage: number }, i: number) => (
                  <div key={lang.language} className="flex items-center gap-3">
                    <div className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: langColors[i % langColors.length] }} />
                    <span className="text-xs font-mono text-nothing-grey-400 flex-1">{lang.language}</span>
                    <span className="text-xs font-mono text-nothing-white">{lang.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-xs font-mono text-nothing-grey-500">
              Sync GitHub to see language data
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-6">Skill Gaps</h3>
          {dashboard?.skillGaps && dashboard.skillGaps.length > 0 ? (
            <div className="space-y-4">
              {dashboard.skillGaps.slice(0, 6).map((gap: { skill: string; current_level: number; required_level: number; gap: number }) => (
                <div key={gap.skill}>
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-nothing-grey-400">{gap.skill}</span>
                    <span className="text-nothing-grey-600">{gap.current_level}/{gap.required_level}</span>
                  </div>
                  <div className="h-[3px] bg-nothing-grey-800 overflow-hidden">
                    <div
                      className={clsx('h-full transition-all duration-500',
                        gap.gap > 3 ? 'bg-nothing-red' : gap.gap > 1 ? 'bg-nothing-grey-400' : 'bg-nothing-white'
                      )}
                      style={{ width: `${(gap.current_level / gap.required_level) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-xs font-mono text-nothing-grey-500">
              Set a career target to see skill gaps
            </div>
          )}
        </Card>
      </div>

      {dashboard?.recentActivity && dashboard.recentActivity.length > 0 && (
        <Card>
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-4">Recent Activity</h3>
          <div className="space-y-0">
            {dashboard.recentActivity.slice(0, 8).map((activity: { action: string; timestamp: string; metadata: Record<string, any> }, i: number) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-nothing-grey-800/50 last:border-0">
                <div className="w-1.5 h-1.5 bg-nothing-red flex-shrink-0" />
                <span className="text-xs font-mono text-nothing-grey-300 flex-1">{activity.action}</span>
                <span className="text-[10px] font-mono text-nothing-grey-600">
                  {new Date(activity.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
