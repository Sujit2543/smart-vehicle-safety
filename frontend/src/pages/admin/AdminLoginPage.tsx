import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Shield, Lock, AlertTriangle, Info, ExternalLink } from 'lucide-react';
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

export default function AdminLoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

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
        toast.error('Cannot reach server. Start the backend first.', { id: 'no-server', duration: 6000 });
        return;
      }
      if (e.response.status === 404 || e.response.status === 405) {
        toast.error('No backend found. Use the local URL below.', { id: 'no-backend', duration: 6000 });
        return;
      }
      if (e.response.status === 401 || e.response.status === 403) {
        toast.error(e.response.data?.message ?? 'Invalid email or password', { id: 'bad-creds' });
        return;
      }
      toast.error(e.response.data?.message ?? 'Login failed.', { id: 'login-err' });
    },
  });

  // ── Deployed (Vercel) — show only the "use local" info page ─
  if (isDeployed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm mt-1">Car Deal Smart Safety Tag</p>
          </div>

          <div className="bg-amber-900/30 border border-amber-500/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <p className="text-amber-300 font-bold text-base">Backend not connected</p>
            </div>
            <p className="text-amber-200/80 text-sm leading-relaxed">
              This Vercel deployment is a <strong>frontend-only preview</strong>.
              The backend runs locally on your machine.
            </p>
            <div className="bg-gray-900/60 rounded-xl p-4 space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                Open this URL on your PC instead:
              </p>
              <a
                href="http://localhost:3000/admin/login"
                className="flex items-center gap-2 text-green-400 font-mono text-sm hover:text-green-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                http://localhost:3000/admin/login
              </a>
            </div>
            <div className="bg-gray-900/60 rounded-xl p-4 space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                Credentials
              </p>
              <p className="text-sm text-gray-300">
                <span className="text-gray-500">Email: </span>
                <span className="font-mono text-white">sujit2001026@gmail.com</span>
              </p>
              <p className="text-sm text-gray-300">
                <span className="text-gray-500">Password: </span>
                <span className="font-mono text-white">Cardeal@123</span>
              </p>
            </div>
            <p className="text-xs text-amber-200/50 text-center">
              Run <code className="bg-gray-900/60 px-1.5 py-0.5 rounded text-amber-300">.\start.ps1</code> first to start both servers
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Local dev — normal login form ────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
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
              placeholder="sujit2001026@gmail.com"
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
              {...register('email')}
              error={errors.email?.message as string}
            />
            <div>
              <label className="text-sm font-medium text-gray-300">Password</label>
              <input
                type="password"
                placeholder="••••••••"
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

        <div className="flex items-start gap-2 p-3 bg-gray-800/60 border border-gray-700 rounded-xl">
          <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400">
            Email: <span className="font-mono text-gray-300">sujit2001026@gmail.com</span>
            {' '}· Password: <span className="font-mono text-gray-300">Cardeal@123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
