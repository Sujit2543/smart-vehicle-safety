import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../../services/api';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { User, Save } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const qc = useQueryClient();
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer-me'],
    queryFn: () => customerApi.getMe().then(r => r.data.data),
  });

  const form = useForm();

  useEffect(() => {
    if (customer) {
      form.reset({
        fullName: customer.fullName,
        email: customer.email ?? '',
        address: customer.address ?? '',
        city: customer.city ?? '',
        state: customer.state ?? '',
        pinCode: customer.pinCode ?? '',
      });
    }
  }, [customer]);

  const updateMut = useMutation({
    mutationFn: (data: any) => customerApi.updateMe(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-me'] }); toast.success('Profile updated'); },
    onError: () => toast.error('Update failed'),
  });

  if (isLoading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-xl font-bold text-gray-900">My Profile</h1>

      <Card>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-brand-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{customer?.fullName}</p>
            <p className="text-gray-500 text-sm">{customer?.mobile}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit(d => updateMut.mutate(d))}>
          <Input label="Full Name" {...form.register('fullName')} required />
          <Input label="Email" type="email" {...form.register('email')} />
          <Input label="Address" {...form.register('address')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" {...form.register('city')} />
            <Input label="State" {...form.register('state')} />
          </div>
          <Input label="PIN Code" maxLength={6} {...form.register('pinCode')} />
          <Button type="submit" loading={updateMut.isPending} icon={<Save className="w-4 h-4" />}>
            Save Changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
