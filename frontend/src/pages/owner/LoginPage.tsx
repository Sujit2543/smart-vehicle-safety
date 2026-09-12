import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Shield, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [mobile, setMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const sendOtp = useMutation({
    mutationFn: () => authApi.sendOtp(mobile),
    onSuccess: () => { setOtpSent(true); toast.success('OTP sent to ' + mobile); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to send OTP'),
  });

  const verifyOtp = useMutation({
    mutationFn: () => authApi.verifyOtp(mobile, otp),
    onSuccess: (res) => {
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      toast.success('Welcome back!');
      navigate(user.isNewUser ? '/dashboard' : '/dashboard');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Invalid OTP'),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Car Deal Safety</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your vehicle portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
            <Phone className="w-4 h-4 text-brand-600" />
            <span className="text-sm text-gray-600">Login with mobile OTP — no password needed</span>
          </div>

          <Input
            label="Mobile Number"
            type="tel"
            maxLength={10}
            placeholder="Enter 10-digit mobile"
            value={mobile}
            onChange={e => { setMobile(e.target.value.replace(/\D/g, '')); setOtpSent(false); setOtp(''); }}
            required
          />

          {!otpSent ? (
            <Button className="w-full" size="lg" loading={sendOtp.isPending}
              disabled={mobile.length !== 10} onClick={() => sendOtp.mutate()}>
              Send OTP
            </Button>
          ) : (
            <>
              <Input
                label="Enter OTP"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit OTP"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                hint="OTP valid for 10 minutes"
                required
              />
              <Button className="w-full" size="lg" loading={verifyOtp.isPending}
                disabled={otp.length !== 6} onClick={() => verifyOtp.mutate()}>
                Verify & Login
              </Button>
              <button className="w-full text-sm text-brand-600 hover:underline text-center"
                onClick={() => { setOtpSent(false); setOtp(''); }}>
                Change number / Resend OTP
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Admin?{' '}
          <Link to="/admin/login" className="text-brand-600 hover:underline">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
