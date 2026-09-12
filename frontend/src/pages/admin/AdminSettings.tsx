import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { Settings, UserPlus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Minimum 8 characters'),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']),
});

export default function AdminSettings() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const createMut = useMutation({
    mutationFn: (d: any) => adminApi.createUser(d),
    onSuccess: () => { reset(); toast.success('Admin user created'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Creation failed'),
  });

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-brand-600" />
          <h3 className="font-semibold text-gray-900">Create Admin User</h3>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(d => createMut.mutate(d))}>
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message as string} required />
          <div>
            <label className="text-sm font-medium text-gray-700">Password <span className="text-red-500">*</span></label>
            <input type="password" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" {...register('password')} />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message as string}</p>}
          </div>
          <Select label="Role" options={[{ value: 'ADMIN', label: 'Admin' }, { value: 'SUPER_ADMIN', label: 'Super Admin' }]} {...register('role')} />
          <Button type="submit" loading={createMut.isPending} icon={<UserPlus className="w-4 h-4" />}>
            Create Admin
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-3">System Info</h3>
        <dl className="space-y-2 text-sm">
          {[
            ['App', 'Car Deal Smart Safety Tag'],
            ['Version', '1.0.0'],
            ['Environment', import.meta.env.MODE],
            ['API URL', import.meta.env.VITE_API_BASE_URL ?? '/api/v1'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <dt className="text-gray-500">{k}</dt>
              <dd className="font-medium text-gray-900 font-mono text-xs">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
