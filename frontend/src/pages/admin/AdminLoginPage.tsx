import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Shield, Lock, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

// True when running on Vercel or any non-local host
const isDeployed =
  typeof window !== 'undefined' &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname) &&
  !window.location.hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/);

// True when a real backend URL has been wired up for production
const hasBackend =
  !isDeployed ||
  (import.meta.env.VITE_API_BASE_URL || '').startsWith('http');

export default function AdminLoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });
  const { setAuth } = useAuthStore();
  const navigate    = useNavigate();

  const loginMut = useMutation({
    mutationFn: (d: any) => authApi.adminLogin(d.email, d.password),
    onSuccess: (res) => {
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      toast.success('Welcome, Admin!');
      navigate('/admin/dashboard');
    },
    onError: (e: any) => {
      if (!e.response) {
        toast.error(
          'Cannot reach server. Run .\\start.ps1 to start the backend.',
          { id: 'no-server', duration: 7000 }
        );
        return;
      }
      if (e.response.status === 404 || e.response.status === 405) {
        toast.error(
          'Backend not found. Open http://localhost:3000/admin/login instead.',
          { id: 'no-backend', duration: 7000 }
        );
        return;
      }
      // 401 / 403 — wrong credentials
      toast.error(
        e.response.data?.message ?? 'Incorrect email or password.',
        { id: 'bad-creds', duration: 5000 }
      );
    },
  });

  // ── Deployed on Vercel WITHOUT a backend URL set ─────────────
  if (isDeployed && !hasBackend) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm mt-1">Car Deal Smart Safety Tag</p>
          </div>

          <div className="bg-amber-900/30 border border-amber-500/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <p className="text-amber-300 font-bold">Backend not connected</p>
            </div>
            <p className="text-amber-200/80 text-sm">
              The Vercel frontend is live but has no backend. Choose one option:
            </p>

            {/* Option A */}
            <div className="bg-gray-900/60 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                Option A — Run locally (works right now)
              </p>
              <ol className="text-xs text-gray-300 space-y-1.5 list-decimal list-inside">
                <li>Open PowerShell in the project folder</li>
                <li>Run <code className="bg-gray-800 text-green-400 px-1 rounded">.\start.ps1</code></li>
                <li>
                  Open{' '}
                  <a
                    href="http://localhost:3000/admin/login"
                    className="text-green-400 font-mono hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    localhost:3000/admin/login
                  </a>
                </li>
              </ol>
            </div>

            {/* Option B */}
            <div className="bg-gray-900/60 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                Option B — Deploy backend to Render (permanent)
              </p>
              <ol className="text-xs text-gray-300 space-y-1.5 list-decimal list-inside">
                <li>
                  Go to{' '}
                  <a href="https://render.com" target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:underline">render.com</a>
                  {' '}→ New → <strong className="text-white">Blueprint</strong>
                </li>
                <li>Connect GitHub → select <span className="text-white font-mono">smart-vehicle-safety</span></li>
                <li>Render reads <code className="bg-gray-800 text-green-400 px-1 rounded">render.yaml</code> automatically</li>
                <li>Click <strong className="text-white">Apply</strong> — wait ~5 min</li>
                <li>Copy your URL e.g. <span className="text-yellow-300 font-mono">cardeal-backend.onrender.com</span></li>
                <li>
                  Go to{' '}
                  <a href="https://vercel.com" target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:underline">vercel.com</a>
                  {' '}→ Project → Settings → Env Vars
                </li>
                <li>
                  Add:{' '}
                  <code className="bg-gray-800 text-green-400 px-1 rounded text-xs">
                    VITE_API_BASE_URL = https://cardeal-backend.onrender.com/api/v1
                  </code>
                </li>
                <li>Redeploy Vercel → done forever</li>
              </ol>
              <div className="flex items-start gap-1.5 text-xs text-green-400 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>After this the admin panel works from any device, anywhere.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Local or deployed WITH backend — clean login form ────────
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">Car Deal Smart Safety Tag</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 space-y-4 border border-gray-700">
          <form className="space-y-4" onSubmit={handleSubmit(d => loginMut.mutate(d))}>
            <Input
              label="Email"
              type="email"
              placeholder="Enter admin email"
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
              {...register('email')}
              error={errors.email?.message as string}
            />
            <div>
              <label className="text-sm font-medium text-gray-300">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                className="mt-1 w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password.message as string}</p>
              )}
            </div>
            <Button
              className="w-full"
              size="lg"
              loading={loginMut.isPending}
              icon={<Lock className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
