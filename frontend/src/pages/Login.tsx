import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/auth.store';
import { Button, Input } from '../components/primitives';
import { useToast } from '../components/primitives';
import { authService } from '../services/auth.service';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      addToast('Welcome back!', 'success');
      navigate(from, { replace: true });
    } catch (err: any) {
      addToast(err.message || 'Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-nothing-black">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 border-r border-nothing-grey-800 items-center justify-center p-16">
        <div className="max-w-sm">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-3 h-3 bg-nothing-red" />
            <span className="text-sm font-mono font-bold tracking-[0.2em] text-nothing-white uppercase">Devintel</span>
          </div>
          <h1 className="text-3xl font-mono font-bold text-nothing-white leading-tight mb-6">
            Developer<br />Intelligence<br />Platform
          </h1>
          <p className="text-sm font-mono text-nothing-grey-500 leading-relaxed mb-12">
            Analyze your GitHub activity, compute your DevScore, and get personalized career intelligence.
          </p>
          <div className="space-y-4">
            {['GitHub Intelligence', 'Resume Analysis', 'DevScore Rating', 'Career Roadmap'].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-nothing-grey-400">
                <div className="w-1 h-1 bg-nothing-red" />
                <span className="text-xs font-mono tracking-wide">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-2.5 h-2.5 bg-nothing-red" />
            <span className="text-sm font-mono font-bold tracking-[0.2em] text-nothing-white uppercase">Devintel</span>
          </div>
          <h2 className="text-lg font-mono font-bold text-nothing-white mb-1">Sign In</h2>
          <p className="text-xs font-mono text-nothing-grey-500 mb-8 tracking-wide">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
            <Button type="submit" variant="primary" className="w-full" isLoading={loading}>Sign In</Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-nothing-grey-800" /></div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-nothing-black text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-600">Or</span>
              </div>
            </div>
            <a href={authService.getGitHubAuthUrl()} className="mt-4 flex items-center justify-center gap-3 w-full px-4 py-2.5 border border-nothing-grey-700 text-nothing-grey-300 text-xs font-mono uppercase tracking-wide hover:border-nothing-grey-500 hover:text-nothing-white transition-colors duration-300">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              Continue with GitHub
            </a>
          </div>
          <p className="mt-8 text-center text-xs font-mono text-nothing-grey-600">
            No account?{' '}<Link to="/register" className="text-nothing-white hover:text-nothing-red transition-colors">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
