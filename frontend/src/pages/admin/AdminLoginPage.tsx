import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Shield, Lock, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

// Detect whether the app is running on a deployed host (Vercel/Railway)
// vs a local dev server where the backend proxy is available.
const isDeployed = !window.location.hostname.includes('localhost') &&
                   !window.location.hostname.match(/^192\.168\.|^10\.|^172\./);

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
      // No response at all → backend not reachable
      if (!e.response) {
        toast.error('Cannot reach server. Make sure the backend is running on port 5000.', { duration: 6000 });
        return;
      }
      // 404 → URL has no backend (Vercel deployment without Railway backend)
      if (e.response.status === 404) {
        toast.error('Backend not connected. Open the local app at http://localhost:3000/admin/login', { duration: 8000 });
        return;
      }
      // 401 / 403 → actual wrong credentials
      if (e.response.status === 401 || e.response.status === 403) {
        toast.error(e.response.data?.message ?? 'Invalid email or password');
        return;
      }
      toast.error(e.response.data?.message ?? 'Login failed. Please try again.');
    },
  });

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">

        {/* ── Banner shown only on deployed host without a backend ── */}
        {isDeployed && (
          <div className="flex items-start gap-3 p-4 bg-amber-900/40 border border-amber-600/40 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-amber-300 font-semibold mb-1">Backend not connected</p>
              <p className="text-amber-200/80 text-xs leading-relaxed">
                This Vercel deployment has no backend yet.
                Run the app <strong>locally</strong> to sign in:
              </p>
              <code className="block mt-1.5 bg-gray-900/60 text-green-400 text-xs px-2 py-1 rounded">
                http://localhost:3000/admin/login
              </code>
              <p className="text-amber-200/60 text-xs mt-1.5">
                Credentials: <span className="font-mono">sujit2001026@gmail.com</span> / <span className="font-mono">Cardeal@123</span>
              </p>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="text-center">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">Car Deal Smart Safety Tag</p>
        </div>

        {/* ── Form ── */}
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
            <Button className="w-full" size="lg" loading={loginMut.isPending} icon={<Lock className="w-4 h-4" />}>
              Sign In
            </Button>
          </form>
        </div>

        {/* ── Local dev hint ── */}
        {!isDeployed && (
          <div className="flex items-start gap-2 p-3 bg-gray-800/60 border border-gray-700 rounded-xl">
            <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">
              Email: <span className="font-mono text-gray-300">sujit2001026@gmail.com</span>
              {' '}· Password: <span className="font-mono text-gray-300">Cardeal@123</span>
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
