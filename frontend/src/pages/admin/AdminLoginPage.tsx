import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Shield, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

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
        toast.error('Cannot reach server. Make sure the backend is running on port 5000.');
      } else {
        toast.error(e.response?.data?.message ?? 'Login failed');
      }
    },
  });

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
              placeholder="admin@cardeal.com"
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
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message as string}</p>}
            </div>
            <Button className="w-full" size="lg" loading={loginMut.isPending} icon={<Lock className="w-4 h-4" />}>
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
