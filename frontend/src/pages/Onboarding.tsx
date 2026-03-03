import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Button, Input, Textarea, Badge, useToast } from '../components/primitives';
import { onboardingService } from '../services/onboarding.service';
import { useAuthStore } from '../context/auth.store';
import type { OnboardingStatus, UserLink, EducationEntry } from '../types';

const TOTAL_STEPS = 8; // 0=username,1=password,2=profile,3=bio,4=links,5=education,6=skills,7=review

const STEP_LABELS = [
  'Username',
  'Password',
  'Profile',
  'Bio',
  'Links',
  'Education',
  'Skills',
  'Review',
];

const LINK_TYPES = ['github', 'linkedin', 'leetcode', 'portfolio', 'twitter', 'blog', 'other'] as const;

const SKILL_SUGGESTIONS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust',
  'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'Django',
  'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS',
  'Git', 'Linux', 'GraphQL', 'TailwindCSS', 'Firebase', 'Figma',
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { refreshUser } = useAuthStore();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Field state
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [links, setLinks] = useState<UserLink[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load onboarding status on mount
  useEffect(() => {
    (async () => {
      try {
        const status: OnboardingStatus = await onboardingService.getStatus();
        if (status.isComplete) {
          navigate('/dashboard', { replace: true });
          return;
        }
        // Pre-fill from saved data
        if (status.data.username) setUsername(status.data.username);
        if (status.data.display_name) setDisplayName(status.data.display_name);
        if (status.data.avatar_url) setAvatarUrl(status.data.avatar_url);
        if (status.data.bio) setBio(status.data.bio);
        if (status.data.links?.length) setLinks(status.data.links);
        if (status.data.education?.length) setEducation(status.data.education);
        if (status.data.skills?.length) setSkills(status.data.skills);
        setStep(Math.min(status.step, TOTAL_STEPS - 1));
      } catch {
        addToast('Failed to load onboarding status', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Username availability check with debounce
  useEffect(() => {
    if (username.length < 3) { setUsernameAvailable(null); return; }
    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const available = await onboardingService.checkUsername(username);
        setUsernameAvailable(available);
      } catch { setUsernameAvailable(null); }
      setUsernameChecking(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  const clearErrors = () => setErrors({});

  const goTo = (target: number) => {
    setDirection(target > step ? 'forward' : 'back');
    clearErrors();
    setStep(target);
  };

  // ---- Step Handlers ----

  const saveUsername = async () => {
    if (username.length < 3) { setErrors({ username: 'At least 3 characters' }); return; }
    if (!/^[a-z0-9_-]+$/.test(username.toLowerCase())) { setErrors({ username: 'Only lowercase letters, numbers, hyphens, underscores' }); return; }
    if (usernameAvailable === false) { setErrors({ username: 'Username is taken' }); return; }
    setSaving(true);
    try {
      await onboardingService.stepUsername(username.toLowerCase());
      goTo(1);
    } catch (err: any) { setErrors({ username: err.message || 'Failed to save' }); }
    setSaving(false);
  };

  const savePassword = async () => {
    if (password.length < 8) { setErrors({ password: 'At least 8 characters' }); return; }
    if (!/[A-Z]/.test(password)) { setErrors({ password: 'Needs an uppercase letter' }); return; }
    if (!/[a-z]/.test(password)) { setErrors({ password: 'Needs a lowercase letter' }); return; }
    if (!/[0-9]/.test(password)) { setErrors({ password: 'Needs a number' }); return; }
    if (password !== confirmPassword) { setErrors({ confirmPassword: 'Passwords do not match' }); return; }
    setSaving(true);
    try {
      await onboardingService.stepPassword(password);
      goTo(2);
    } catch (err: any) { setErrors({ password: err.message || 'Failed to save' }); }
    setSaving(false);
  };

  const saveProfile = async () => {
    if (!displayName.trim()) { setErrors({ displayName: 'Display name is required' }); return; }
    setSaving(true);
    try {
      await onboardingService.stepProfile(displayName.trim(), avatarUrl || undefined);
      goTo(3);
    } catch (err: any) { setErrors({ displayName: err.message || 'Failed to save' }); }
    setSaving(false);
  };

  const saveBio = async () => {
    if (!bio.trim()) { setErrors({ bio: 'A short bio is required' }); return; }
    if (bio.length > 500) { setErrors({ bio: 'Max 500 characters' }); return; }
    setSaving(true);
    try {
      await onboardingService.stepBio(bio.trim());
      goTo(4);
    } catch (err: any) { setErrors({ bio: err.message || 'Failed to save' }); }
    setSaving(false);
  };

  const saveLinks = async () => {
    const filtered = links.filter((l) => l.url.trim());
    setSaving(true);
    try {
      await onboardingService.stepLinks(filtered);
      goTo(5);
    } catch (err: any) { setErrors({ links: err.message || 'Failed to save' }); }
    setSaving(false);
  };

  const saveEducation = async () => {
    setSaving(true);
    try {
      await onboardingService.stepEducation(education);
      goTo(6);
    } catch (err: any) { setErrors({ education: err.message || 'Failed to save' }); }
    setSaving(false);
  };

  const saveSkills = async () => {
    if (skills.length === 0) { setErrors({ skills: 'Add at least one skill' }); return; }
    setSaving(true);
    try {
      await onboardingService.stepSkills(skills);
      goTo(7);
    } catch (err: any) { setErrors({ skills: err.message || 'Failed to save' }); }
    setSaving(false);
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      await onboardingService.complete();
      await refreshUser();
      addToast('Welcome to DevIntel!', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      addToast(err.message || 'Failed to complete onboarding', 'error');
    }
    setSaving(false);
  };

  // ---- Link / Education / Skill helpers ----

  const addLink = () => setLinks([...links, { link_type: 'github', url: '', label: '' }]);
  const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));
  const updateLink = (i: number, key: keyof UserLink, value: string) =>
    setLinks(links.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));

  const addEducation = () =>
    setEducation([...education, { degree: '', institution: '', field_of_study: '', start_year: new Date().getFullYear(), is_current: true }]);
  const removeEducation = (i: number) => setEducation(education.filter((_, idx) => idx !== i));
  const updateEducation = (i: number, key: keyof EducationEntry, value: any) =>
    setEducation(education.map((e, idx) => (idx === i ? { ...e, [key]: value } : e)));

  const addSkill = useCallback((skill: string) => {
    const s = skill.trim();
    if (s && !skills.includes(s) && skills.length < 30) {
      setSkills([...skills, s]);
    }
    setSkillInput('');
  }, [skills]);

  const removeSkill = (s: string) => setSkills(skills.filter((sk) => sk !== s));

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  // ---- RENDER ----

  if (loading) {
    return (
      <div className="min-h-screen bg-nothing-black flex items-center justify-center">
        <div className="w-5 h-5 border border-nothing-white border-t-transparent animate-spin" />
      </div>
    );
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-nothing-black flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-nothing-grey-900">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-nothing-red" />
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-nothing-white uppercase">Devintel</span>
        </div>
        <span className="text-[10px] font-mono text-nothing-grey-600 uppercase tracking-wider">
          Step {step + 1} of {TOTAL_STEPS} — {STEP_LABELS[step]}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-[2px] bg-nothing-grey-900">
        <div
          className="h-full bg-nothing-red transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div
          key={step}
          className={clsx(
            'w-full max-w-lg',
            direction === 'forward' ? 'animate-slide-left' : 'animate-slide-right'
          )}
        >
          {step === 0 && <StepUsername
            username={username} setUsername={setUsername}
            available={usernameAvailable} checking={usernameChecking}
            errors={errors} saving={saving} onNext={saveUsername}
          />}
          {step === 1 && <StepPassword
            password={password} setPassword={setPassword}
            confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
            errors={errors} saving={saving} onNext={savePassword} onBack={() => goTo(0)}
          />}
          {step === 2 && <StepProfile
            displayName={displayName} setDisplayName={setDisplayName}
            avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl}
            errors={errors} saving={saving} onNext={saveProfile} onBack={() => goTo(1)}
          />}
          {step === 3 && <StepBio
            bio={bio} setBio={setBio}
            errors={errors} saving={saving} onNext={saveBio} onBack={() => goTo(2)}
          />}
          {step === 4 && <StepLinks
            links={links} addLink={addLink} removeLink={removeLink} updateLink={updateLink}
            errors={errors} saving={saving} onNext={saveLinks} onBack={() => goTo(3)}
          />}
          {step === 5 && <StepEducation
            education={education} addEducation={addEducation} removeEducation={removeEducation} updateEducation={updateEducation}
            errors={errors} saving={saving} onNext={saveEducation} onBack={() => goTo(4)}
          />}
          {step === 6 && <StepSkills
            skills={skills} skillInput={skillInput} setSkillInput={setSkillInput}
            addSkill={addSkill} removeSkill={removeSkill} handleSkillKeyDown={handleSkillKeyDown}
            errors={errors} saving={saving} onNext={saveSkills} onBack={() => goTo(5)}
          />}
          {step === 7 && <StepReview
            username={username} displayName={displayName} bio={bio}
            links={links} education={education} skills={skills}
            saving={saving} onComplete={completeOnboarding} onBack={() => goTo(6)}
          />}
        </div>
      </main>

      {/* Step dots */}
      <footer className="flex items-center justify-center gap-2 py-6">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <button
            key={i}
            onClick={() => i <= step ? goTo(i) : undefined}
            className={clsx(
              'w-2 h-2 transition-all duration-300',
              i === step ? 'bg-nothing-red scale-125' : i < step ? 'bg-nothing-grey-500 cursor-pointer hover:bg-nothing-grey-400' : 'bg-nothing-grey-800'
            )}
          />
        ))}
      </footer>
    </div>
  );
}

// ============================================================
// Step Components — Cinematic, one-focus-per-screen
// ============================================================

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-mono font-bold text-nothing-white mb-2">{title}</h2>
      <p className="text-sm font-mono text-nothing-grey-500">{subtitle}</p>
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel = 'Continue', saving = false, nextDisabled = false }: {
  onBack?: () => void; onNext?: () => void; nextLabel?: string; saving?: boolean; nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-10">
      {onBack ? (
        <Button variant="ghost" size="md" onClick={onBack}>← Back</Button>
      ) : <div />}
      {onNext && (
        <Button variant="primary" size="lg" onClick={onNext} isLoading={saving} disabled={nextDisabled}>
          {nextLabel}
        </Button>
      )}
    </div>
  );
}

// ---- Username ----
function StepUsername({ username, setUsername, available, checking, errors, saving, onNext }: any) {
  return (
    <div>
      <StepHeading title="Choose your username" subtitle="This will be your unique identity on DevIntel." />
      <Input
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
        placeholder="your-username"
        error={errors.username}
        maxLength={20}
        autoFocus
        hint={
          checking ? 'Checking…' : available === true ? '✓ Available' : available === false ? '✗ Taken' : 'Lowercase letters, numbers, hyphens, underscores'
        }
      />
      <NavButtons onNext={onNext} saving={saving} nextDisabled={username.length < 3 || available === false} />
    </div>
  );
}

// ---- Password ----
function StepPassword({ password, setPassword, confirmPassword, setConfirmPassword, errors, saving, onNext, onBack }: any) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ];
  return (
    <div>
      <StepHeading title="Set your password" subtitle="Secure your account with a strong password." />
      <div className="space-y-4">
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" error={errors.password} autoFocus />
        <Input label="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" error={errors.confirmPassword} />
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {checks.map((c) => (
          <span key={c.label} className={clsx('text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border', c.ok ? 'border-emerald-500/40 text-emerald-400' : 'border-nothing-grey-700 text-nothing-grey-600')}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
      <NavButtons onBack={onBack} onNext={onNext} saving={saving} />
    </div>
  );
}

// ---- Profile ----
function StepProfile({ displayName, setDisplayName, avatarUrl, setAvatarUrl, errors, saving, onNext, onBack }: any) {
  return (
    <div>
      <StepHeading title="Your identity" subtitle="How should others see you?" />
      <div className="space-y-5">
        <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="John Doe" error={errors.displayName} autoFocus maxLength={128} />
        <Input label="Avatar URL (optional)" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." hint="Will default to your GitHub avatar if available" />
      </div>
      <NavButtons onBack={onBack} onNext={onNext} saving={saving} />
    </div>
  );
}

// ---- Bio ----
function StepBio({ bio, setBio, errors, saving, onNext, onBack }: any) {
  return (
    <div>
      <StepHeading title="Tell us about yourself" subtitle="A short bio that describes what you do." />
      <div className="relative">
        <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Full-stack developer passionate about open source..." rows={4} maxLength={500} error={errors.bio} autoFocus />
        <span className="absolute bottom-2 right-3 text-[10px] font-mono text-nothing-grey-600">{bio.length}/500</span>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} saving={saving} />
    </div>
  );
}

// ---- Links ----
function StepLinks({ links, addLink, removeLink, updateLink, errors, saving, onNext, onBack }: any) {
  return (
    <div>
      <StepHeading title="Your profiles & links" subtitle="Add your external developer profiles. All optional." />
      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {links.map((link: UserLink, i: number) => (
          <div key={i} className="flex gap-2 items-start">
            <select
              value={link.link_type}
              onChange={(e) => updateLink(i, 'link_type', e.target.value)}
              className="input-base w-32 shrink-0 text-sm"
            >
              {LINK_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <Input value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)} placeholder="https://..." className="flex-1" />
            <button onClick={() => removeLink(i)} className="text-nothing-grey-500 hover:text-nothing-red text-lg mt-2">×</button>
          </div>
        ))}
      </div>
      {links.length < 10 && (
        <button onClick={addLink} className="mt-3 text-xs font-mono text-nothing-grey-400 hover:text-nothing-white uppercase tracking-wider">
          + Add Link
        </button>
      )}
      {errors.links && <p className="text-[11px] text-nothing-red font-mono mt-2">{errors.links}</p>}
      <NavButtons onBack={onBack} onNext={onNext} nextLabel={links.length === 0 ? 'Skip' : 'Continue'} saving={saving} />
    </div>
  );
}

// ---- Education ----
function StepEducation({ education, addEducation, removeEducation, updateEducation, errors, saving, onNext, onBack }: any) {
  return (
    <div>
      <StepHeading title="Education" subtitle="Add your educational background. Optional." />
      <div className="space-y-6 max-h-[380px] overflow-y-auto pr-1">
        {education.map((edu: EducationEntry, i: number) => (
          <div key={i} className="border border-nothing-grey-800 p-4 space-y-3 relative">
            <button onClick={() => removeEducation(i)} className="absolute top-2 right-2 text-nothing-grey-500 hover:text-nothing-red text-lg">×</button>
            <Input label="Degree" value={edu.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)} placeholder="B.Tech" />
            <Input label="Institution" value={edu.institution} onChange={(e) => updateEducation(i, 'institution', e.target.value)} placeholder="MIT" />
            <Input label="Field of study" value={edu.field_of_study || ''} onChange={(e) => updateEducation(i, 'field_of_study', e.target.value)} placeholder="Computer Science" />
            <div className="flex gap-3">
              <Input label="Start year" type="number" value={edu.start_year || ''} onChange={(e) => updateEducation(i, 'start_year', parseInt(e.target.value) || '')} />
              <Input label="End year" type="number" value={edu.end_year || ''} onChange={(e) => updateEducation(i, 'end_year', parseInt(e.target.value) || '')} disabled={edu.is_current} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!edu.is_current} onChange={(e) => updateEducation(i, 'is_current', e.target.checked)} className="accent-nothing-red" />
              <span className="text-xs font-mono text-nothing-grey-400">Currently studying here</span>
            </label>
          </div>
        ))}
      </div>
      {education.length < 5 && (
        <button onClick={addEducation} className="mt-3 text-xs font-mono text-nothing-grey-400 hover:text-nothing-white uppercase tracking-wider">
          + Add Education
        </button>
      )}
      {errors.education && <p className="text-[11px] text-nothing-red font-mono mt-2">{errors.education}</p>}
      <NavButtons onBack={onBack} onNext={onNext} nextLabel={education.length === 0 ? 'Skip' : 'Continue'} saving={saving} />
    </div>
  );
}

// ---- Skills ----
function StepSkills({ skills, skillInput, setSkillInput, addSkill, removeSkill, handleSkillKeyDown, errors, saving, onNext, onBack }: any) {
  return (
    <div>
      <StepHeading title="Your skills" subtitle="Add technologies and tools you're proficient in." />
      <Input
        label="Add skill"
        value={skillInput}
        onChange={(e) => setSkillInput(e.target.value)}
        onKeyDown={handleSkillKeyDown}
        placeholder="Type and press Enter…"
        autoFocus
        hint={`${skills.length}/30 skills added`}
        error={errors.skills}
      />
      {/* Tags */}
      <div className="flex flex-wrap gap-2 mt-4 min-h-[40px]">
        {skills.map((s: string) => (
          <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border border-nothing-grey-600 text-nothing-grey-300">
            {s}
            <button onClick={() => removeSkill(s)} className="text-nothing-grey-500 hover:text-nothing-red">×</button>
          </span>
        ))}
      </div>
      {/* Suggestions */}
      <div className="mt-5">
        <p className="text-[10px] font-mono text-nothing-grey-600 uppercase tracking-wider mb-2">Suggestions</p>
        <div className="flex flex-wrap gap-1.5">
          {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).slice(0, 16).map((s) => (
            <button
              key={s}
              onClick={() => addSkill(s)}
              className="text-[11px] font-mono px-2 py-0.5 border border-nothing-grey-800 text-nothing-grey-500 hover:border-nothing-grey-500 hover:text-nothing-grey-300 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} saving={saving} nextDisabled={skills.length === 0} />
    </div>
  );
}

// ---- Review ----
function StepReview({ username, displayName, bio, links, education, skills, saving, onComplete, onBack }: any) {
  return (
    <div>
      <StepHeading title="Review & complete" subtitle="Everything looks good? Let's go!" />
      <div className="space-y-5 max-h-[400px] overflow-y-auto pr-1">
        <ReviewSection label="Username" value={`@${username}`} />
        <ReviewSection label="Display name" value={displayName || '—'} />
        <ReviewSection label="Bio" value={bio || '—'} />
        <ReviewSection label="Links" value={links.length > 0 ? links.map((l: UserLink) => `${l.link_type}: ${l.url}`).join('\n') : 'None'} />
        <ReviewSection label="Education" value={education.length > 0 ? education.map((e: EducationEntry) => `${e.degree} @ ${e.institution}`).join('\n') : 'None'} />
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-nothing-grey-500 mb-1.5">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {skills.length > 0 ? skills.map((s: string) => (
              <Badge key={s} size="sm">{s}</Badge>
            )) : <span className="text-xs text-nothing-grey-600 font-mono">None</span>}
          </div>
        </div>
      </div>
      <NavButtons onBack={onBack} onNext={onComplete} nextLabel="Complete Setup" saving={saving} />
    </div>
  );
}

function ReviewSection({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-nothing-grey-500 mb-1">{label}</p>
      <p className="text-sm font-mono text-nothing-grey-200 whitespace-pre-line">{value}</p>
    </div>
  );
}
