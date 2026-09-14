import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { customerApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { User, Save, Phone, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Invalid email').optional().or(z.literal('')),
  address:  z.string().max(500).optional(),
  city:     z.string().max(100).optional(),
  state:    z.string().max(100).optional(),
  pinCode:  z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code').optional().or(z.literal('')),
});

type ProfileForm = z.infer<typeof schema>;

export default function CustomerProfilePage() {
  const qc      = useQueryClient();
  const { user, updateUser } = useAuthStore();

  // Fetch customer profile — returns null if not created yet (new user, no tag activated)
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer-me'],
    queryFn:  () => customerApi.getMe().then(r => r.data.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email:    '',
      address:  '',
      city:     '',
      state:    '',
      pinCode:  '',
    },
  });

  // Populate form whenever customer data arrives (or when it's null — prefill with mobile)
  useEffect(() => {
    reset({
      fullName: customer?.fullName ?? '',
      email:    customer?.email    ?? '',
      address:  customer?.address  ?? '',
      city:     customer?.city     ?? '',
      state:    customer?.state    ?? '',
      pinCode:  customer?.pinCode  ?? '',
    });
  }, [customer, reset]);

  const isNewProfile = !customer;

  const updateMut = useMutation({
    mutationFn: (d: ProfileForm) => customerApi.updateMe(d as any),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['customer-me'] });
      // Update auth store so the sidebar avatar etc. reflects the new name
      if (res.data?.data?.fullName) {
        updateUser({ customerId: res.data.data.id });
      }
      toast.success(isNewProfile ? 'Profile created successfully! 🎉' : 'Profile updated successfully');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Save failed';
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const mobile = user?.mobile ?? customer?.mobile ?? '';
  const displayName = customer?.fullName ?? 'U';

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal information</p>
      </div>

      {/* New user banner */}
      {isNewProfile && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Complete your profile</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Fill in your details below and click Save Changes to set up your profile.
            </p>
          </div>
        </div>
      )}

      {/* Avatar + mobile */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-2xl font-bold flex-shrink-0">
            {displayName[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">
              {customer?.fullName ?? 'New User'}
            </p>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-0.5">
              <Phone className="w-3.5 h-3.5" />
              <span>+91 {mobile}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Mobile number cannot be changed</p>
          </div>
        </div>
      </Card>

      {/* Edit form */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-600" /> Personal Information
        </h3>
        <form className="space-y-4" onSubmit={handleSubmit(d => updateMut.mutate(d))}>
          <Input
            label="Full Name"
            placeholder="Your full name"
            {...register('fullName')}
            error={errors.fullName?.message as string}
            required
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="your@email.com"
            {...register('email')}
            error={errors.email?.message as string}
          />
          <Input
            label="Address"
            placeholder="House No., Street, Area"
            {...register('address')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City"  placeholder="Mumbai"      {...register('city')}  />
            <Input label="State" placeholder="Maharashtra" {...register('state')} />
          </div>
          <Input
            label="PIN Code"
            placeholder="400001"
            maxLength={6}
            {...register('pinCode')}
            error={errors.pinCode?.message as string}
          />

          <Button
            type="submit"
            className="w-full"
            loading={updateMut.isPending || isSubmitting}
            disabled={!isDirty && !isNewProfile}
            icon={<Save className="w-4 h-4" />}
          >
            {isNewProfile ? 'Create Profile' : 'Save Changes'}
          </Button>
        </form>
      </Card>

      {/* Account info (read-only) */}
      {customer && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Account Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Customer ID</span>
              <span className="font-mono text-xs text-gray-600">{customer.id?.slice(0, 16)}…</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Member Since</span>
              <span className="text-gray-700">
                {customer.createdAt
                  ? new Date(customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Account Status</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                customer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {customer.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
