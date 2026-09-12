import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Shield, Phone, QrCode } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function CustomerLoginPage() {
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const [mobile,   setMobile]   = useState('');
  const [otp,      setOtp]      = useState('');
  const [otpSent,  setOtpSent]  = useState(false);
  const [devOtp,   setDevOtp]   = useState<string | null>(null);
  const [timer,    setTimer]    = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user?.role === 'CUSTOMER') {
      navigate('/customer/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const sendOtp = useMutation({
    mutationFn: () => authApi.sendOtp(mobile),
    onSuccess: (res) => {
      setOtpSent(true);
      setTimer(60);
      const code = res.data.data?.otp;
      if (code) {
        setDevOtp(code);
        toast.success('Your OTP is ready', { duration: 5000, icon: '🔑' });
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to send OTP'),
  });

  const verifyOtp = useMutation({
    mutationFn: () => authApi.verifyOtp(mobile, otp),
    onSuccess: (res) => {
      const { accessToken, user: u } = res.data.data;
      setAuth(u, accessToken);
      setDevOtp(null);
      toast.success('Welcome back! 👋');
      navigate('/customer/dashboard', { replace: true });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Invalid OTP'),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-600 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Car Deal Safety</h1>
          <p className="text-blue-200 text-sm mt-1">Sign in to your vehicle portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 space-y-4">
          {/* Method badge */}
          <div className="flex items-center gap-2 p-3 bg-brand-50 rounded-xl">
            <Phone className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span className="text-sm text-gray-600">Sign in with mobile OTP — no password needed</span>
          </div>

          {/* Mobile input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Mobile Number</label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 bg-gray-100 rounded-xl text-sm text-gray-600 font-medium border border-gray-200 flex-shrink-0">
                +91
              </div>
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit number"
                value={mobile}
                onChange={e => {
                  setMobile(e.target.value.replace(/\D/g, ''));
                  if (otpSent) { setOtpSent(false); setOtp(''); setDevOtp(null); }
                }}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* OTP display — tap to auto-fill */}
          {devOtp && (
            <div
              className="flex items-center gap-3 p-4 bg-brand-50 border-2 border-brand-300 rounded-2xl cursor-pointer hover:bg-brand-100 transition-colors"
              onClick={() => { setOtp(devOtp); toast.success('OTP filled!', { icon: '✅', duration: 1500 }); }}
              title="Tap to auto-fill OTP"
            >
              <div className="flex-1 text-center">
                <p className="text-xs font-semibold text-brand-700 mb-1">Your OTP — tap to fill</p>
                <p className="text-4xl font-mono font-bold text-brand-700 tracking-[0.4em]">{devOtp}</p>
              </div>
              <span className="text-xs text-brand-600 bg-brand-200 px-2 py-1 rounded-lg font-medium flex-shrink-0">TAP</span>
            </div>
          )}

          {!otpSent ? (
            <Button className="w-full" size="lg" loading={sendOtp.isPending}
              disabled={mobile.length !== 10}
              onClick={() => sendOtp.mutate()}>
              Send OTP
            </Button>
          ) : (
            <div className="space-y-4">
              {/* OTP single input — large and clear */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block text-center">
                  Enter the 6-digit OTP sent to +91{mobile}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter OTP"
                  value={otp}
                  autoFocus
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full border-2 border-gray-300 rounded-2xl px-4 py-4 text-center text-3xl font-bold font-mono tracking-[0.5em] focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all bg-white text-gray-900 placeholder:text-gray-300 placeholder:text-lg placeholder:tracking-normal"
                />
                {/* Progress dots */}
                <div className="flex justify-center gap-2 mt-3">
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < otp.length ? 'bg-brand-600 scale-110' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>

              <Button className="w-full" size="lg" loading={verifyOtp.isPending}
                disabled={otp.length !== 6}
                onClick={() => verifyOtp.mutate()}>
                Verify & Sign In
              </Button>

              {/* Resend / change */}
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => { setOtpSent(false); setOtp(''); setDevOtp(null); }}
                  className="text-brand-600 hover:underline">
                  Change number
                </button>
                {timer > 0
                  ? <span className="text-gray-400">Resend in {timer}s</span>
                  : (
                    <button onClick={() => { setOtp(''); sendOtp.mutate(); }}
                      disabled={sendOtp.isPending}
                      className="text-brand-600 hover:underline disabled:opacity-50">
                      Resend OTP
                    </button>
                  )
                }
              </div>
            </div>
          )}
        </div>

        {/* Bottom links */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-blue-200 text-sm">
            New user?{' '}
            <span className="text-white font-medium">Scan your physical QR tag to activate.</span>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-blue-200 text-xs">
            <QrCode className="w-3.5 h-3.5" />
            <span>Or open a tag URL like /tag/CD-1001</span>
          </div>
          <p className="text-blue-200/60 text-xs mt-2">
            Admin?{' '}
            <Link to="/admin/login" className="text-blue-200 hover:text-white underline">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
