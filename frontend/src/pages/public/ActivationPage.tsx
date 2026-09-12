import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi, tagApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  Shield, ChevronRight, ChevronLeft, Check, Upload,
  Phone, Car, User, AlertTriangle, FileText, Lock,
  CheckCircle2, Eye, EyeOff, X, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: 'Mobile',    icon: Phone },
  { id: 1, label: 'Personal',  icon: User },
  { id: 2, label: 'Vehicle',   icon: Car },
  { id: 3, label: 'Emergency', icon: AlertTriangle },
  { id: 4, label: 'Documents', icon: FileText },
  { id: 5, label: 'PIN',       icon: Lock },
  { id: 6, label: 'Review',    icon: CheckCircle2 },
];

const VEHICLE_TYPES = [
  { value: '',             label: 'Select vehicle type' },
  { value: 'TWO_WHEELER',  label: 'Two Wheeler' },
  { value: 'THREE_WHEELER',label: 'Three Wheeler' },
  { value: 'CAR',          label: 'Car' },
  { value: 'SUV',          label: 'SUV' },
  { value: 'MUV',          label: 'MUV' },
  { value: 'TRUCK',        label: 'Truck' },
  { value: 'BUS',          label: 'Bus' },
  { value: 'COMMERCIAL',   label: 'Commercial' },
  { value: 'OTHER',        label: 'Other' },
];

const FUEL_TYPES = [
  { value: '',         label: 'Select fuel type' },
  { value: 'PETROL',   label: 'Petrol' },
  { value: 'DIESEL',   label: 'Diesel' },
  { value: 'CNG',      label: 'CNG' },
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'HYBRID',   label: 'Hybrid' },
  { value: 'LPG',      label: 'LPG' },
];

// ─────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────

const personalSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email:    z.string().email('Enter a valid email').optional().or(z.literal('')),
  address:  z.string().optional(),
  city:     z.string().min(1, 'City is required'),
  state:    z.string().min(1, 'State is required'),
  pinCode:  z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
});

const vehicleSchema = z.object({
  registrationNumber: z.string()
    .min(5, 'Enter a valid registration number')
    .max(15, 'Registration number too long')
    .regex(/^[A-Z0-9\-]+$/, 'Only uppercase letters, numbers, hyphens allowed'),
  vehicleType:       z.string().min(1, 'Vehicle type is required'),
  make:              z.string().min(1, 'Vehicle make is required'),
  model:             z.string().min(1, 'Vehicle model is required'),
  color:             z.string().min(1, 'Color is required'),
  manufacturingYear: z.string().regex(/^\d{4}$/, 'Enter a valid 4-digit year'),
  fuelType:          z.string().min(1, 'Fuel type is required'),
});

const emergencySchema = z.object({
  emergencyName:         z.string().min(2, 'Name must be at least 2 characters'),
  emergencyMobile:       z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  emergencyRelationship: z.string().min(2, 'Relationship is required'),
});

// ─────────────────────────────────────────────────────────────
// FILE UPLOAD ROW
// ─────────────────────────────────────────────────────────────

function DocUploadRow({
  label, docKey, file, onChange, onRemove,
}: {
  label: string; docKey: string; file?: File;
  onChange: (f: File) => void; onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-colors
      border-gray-200 hover:border-brand-300 bg-white">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${file ? 'bg-green-100' : 'bg-gray-100'}`}>
        {file ? <Check className="w-4 h-4 text-green-600" /> : <Upload className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {file
          ? <p className="text-xs text-green-600 truncate">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
          : <p className="text-xs text-gray-400">PDF, JPG or PNG • Max 5 MB</p>
        }
      </div>
      {file ? (
        <button type="button" onClick={onRemove}
          className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <label className="cursor-pointer flex-shrink-0">
          <input type="file" accept="image/*,application/pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ''; }} />
          <span className="text-xs px-2.5 py-1.5 bg-brand-50 text-brand-600 rounded-lg font-medium hover:bg-brand-100 transition-colors">
            Choose
          </span>
        </label>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / (total - 1)) * 100);
  return (
    <div className="w-full bg-white/20 rounded-full h-1.5">
      <div className="bg-white h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REVIEW ROW
// ─────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0 w-28">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value || '—'}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function ActivationPage() {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate   = useNavigate();
  const { setAuth, isAuthenticated, user } = useAuthStore();

  // Step state
  const [step,        setStep]        = useState(0);
  const [activated,   setActivated]   = useState(false);
  const [activatedVehicle, setActivatedVehicle] = useState<string>('');

  // Step 0: OTP
  const [mobile,   setMobile]   = useState('');
  const [otp,      setOtp]      = useState('');
  const [otpSent,  setOtpSent]  = useState(false);
  const [devOtp,   setDevOtp]   = useState<string | null>(null);
  const [timer,    setTimer]    = useState(0);

  // Step 5: PIN
  const [pin,        setPin]        = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPin,    setShowPin]    = useState(false);

  // Step 4: Documents
  const [files, setFiles] = useState<{ rc?: File; insurance?: File; puc?: File }>({});

  // Forms
  const personalForm  = useForm({ resolver: zodResolver(personalSchema) });
  const vehicleForm   = useForm({ resolver: zodResolver(vehicleSchema) });
  const emergencyForm = useForm({ resolver: zodResolver(emergencySchema) });

  // If already authenticated as customer, skip OTP step and populate mobile from auth store
  useEffect(() => {
    if (isAuthenticated && user?.role === 'CUSTOMER' && step === 0) {
      // Populate mobile from the authenticated user so the activation payload is correct
      if (user.mobile && !mobile) {
        setMobile(user.mobile.replace(/^\+91/, ''));
      }
      setStep(1);
    }
  }, [isAuthenticated, user, step]);

  // OTP countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  // Verify tag is actually UNASSIGNED before showing form
  const { data: tagCheck, isLoading: checkingTag } = useQuery({
    queryKey: ['tag-check', tagId],
    queryFn:  () => tagApi.scan(tagId!).then(r => r.data.data),
    enabled:  !!tagId,
    retry:    false,
  });

  useEffect(() => {
    if (!tagCheck) return;
    if (tagCheck.status === 'ACTIVE')    { navigate(`/tag/${tagId}`, { replace: true }); }
    if (tagCheck.status === 'BLOCKED')   { navigate(`/tag/${tagId}`, { replace: true }); }
    if (tagCheck.status === 'INACTIVE')  { navigate(`/tag/${tagId}`, { replace: true }); }
  }, [tagCheck, navigate, tagId]);

  // ── Mutations ─────────────────────────────────────────────

  const sendOtpMut = useMutation({
    mutationFn: () => authApi.sendOtp(mobile),
    onSuccess: (res) => {
      setOtpSent(true);
      setTimer(60);
      const code = res.data.data?.otp;
      if (code) {
        setDevOtp(code);
        toast.success(`Your OTP is ready`, { duration: 5000, icon: '🔑' });
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to send OTP'),
  });

  const verifyOtpMut = useMutation({
    mutationFn: () => authApi.verifyOtp(mobile, otp),
    onSuccess: (res) => {
      const { accessToken, user: u } = res.data.data;
      setAuth(u, accessToken);
      // Ensure mobile is populated from the verified number (in case auth store had a different value)
      if (u.mobile) setMobile(u.mobile.replace(/^\+91/, ''));
      setDevOtp(null);
      toast.success('Mobile verified ✅');
      setStep(1);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Invalid OTP'),
  });

  const activateMut = useMutation({
    mutationFn: async () => {
      const p  = personalForm.getValues();
      const v  = vehicleForm.getValues();
      const em = emergencyForm.getValues();

      // Use mobile from state; fall back to auth store if somehow empty
      const effectiveMobile = mobile || (user?.mobile?.replace(/^\+91/, '') ?? '');

      const payload = {
        fullName: p.fullName,
        email:    (p.email ?? '').trim(),
        address:  (p.address ?? '').trim(),
        city:     p.city ?? '',
        state:    p.state ?? '',
        pinCode:  p.pinCode ?? '',
        mobile: effectiveMobile,
        registrationNumber: v.registrationNumber.toUpperCase().replace(/\s+/g, ''),
        vehicleType: v.vehicleType,
        make:  v.make,
        model: v.model,
        color: v.color,
        manufacturingYear: Number(v.manufacturingYear),
        fuelType: v.fuelType,
        emergencyName:         em.emergencyName,
        emergencyMobile:       em.emergencyMobile,
        emergencyRelationship: em.emergencyRelationship,
        pin,
      };

      const fd = new FormData();
      fd.append('data', JSON.stringify(payload));
      if (files.rc)        fd.append('rc',        files.rc);
      if (files.insurance) fd.append('insurance',  files.insurance);
      if (files.puc)       fd.append('puc',        files.puc);

      return tagApi.activate(tagId!, fd);
    },
    onSuccess: (res) => {
      const v = vehicleForm.getValues();
      setActivatedVehicle(v.registrationNumber.toUpperCase().replace(/\s+/g, ''));
      setActivated(true);
    },
    onError: (e: any) => {
      const data = e.response?.data;

      // Network error — backend unreachable
      if (!e.response) {
        toast.error('Cannot reach server. Check your WiFi connection and try again.', { duration: 5000 });
        return;
      }

      // Validation errors — show each field
      if (data?.errors) {
        const msgs = Object.entries(data.errors)
          .map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`)
          .join('\n');
        toast.error(msgs, { duration: 8000 });
        return;
      }

      // Conflict — vehicle already registered
      if (e.response.status === 409) {
        toast.error(data?.message ?? 'This vehicle is already registered. Contact support if this is your vehicle.', { duration: 6000 });
        return;
      }

      // Tag already activated
      if (e.response.status === 400 && data?.message?.includes('already activated')) {
        toast.error('This tag is already activated. Scan it to see the vehicle page.', { duration: 5000 });
        navigate(`/tag/${tagId}`);
        return;
      }

      toast.error(data?.message ?? 'Activation failed. Please try again.', { duration: 5000 });
    },
  });

  // ── Rendering guards ──────────────────────────────────────

  if (checkingTag) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center">
        <div className="text-center text-white space-y-3">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm opacity-80">Checking tag status…</p>
        </div>
      </div>
    );
  }

  // ── Success Screen ────────────────────────────────────────

  if (activated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center space-y-5">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tag Activated! 🎉</h1>
            <p className="text-gray-500 text-sm mt-1">Your Smart Safety Tag is now active</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Tag ID</span>
              <span className="font-mono font-bold text-brand-600">{tagId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Vehicle</span>
              <span className="font-semibold text-gray-800">{activatedVehicle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Status</span>
              <span className="text-green-600 font-semibold text-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> ACTIVE
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Button className="w-full" size="lg" onClick={() => navigate('/dashboard')}>
              Go to My Dashboard
            </Button>
            <p className="text-xs text-gray-400">
              Your emergency contacts can now reach you through this tag.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Helpers ───────────────────────────────────────────────

  const currentStepInfo = STEPS[step];
  const pV = personalForm.getValues();
  const vV = vehicleForm.getValues();
  const eV = emergencyForm.getValues();

  const docCount = [files.rc, files.insurance, files.puc].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-600 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ── Card ───────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 pt-6 pb-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-sm">Car Deal Safety Tag</span>
              </div>
              <span className="font-mono text-blue-200 text-xs bg-white/10 px-2 py-1 rounded-lg">{tagId}</span>
            </div>

            {/* Step name */}
            <p className="text-white/60 text-xs mt-3 mb-1">
              Step {step + 1} of {STEPS.length} — <span className="text-white font-semibold">{currentStepInfo.label}</span>
            </p>
            <ProgressBar step={step} total={STEPS.length} />

            {/* Step dots */}
            <div className="flex gap-1.5 mt-3 justify-center">
              {STEPS.map((s, i) => (
                <div key={s.id} className={`transition-all duration-300 rounded-full ${
                  i < step  ? 'w-5 h-1.5 bg-white' :
                  i === step ? 'w-5 h-1.5 bg-white' :
                               'w-1.5 h-1.5 bg-white/30'
                }`} />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">

            {/* ── STEP 0: Mobile OTP ─────────────────────── */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Verify Your Mobile</h2>
                  <p className="text-sm text-gray-500 mt-0.5">We'll send an OTP to confirm your number</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Mobile Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 bg-gray-100 rounded-xl text-sm text-gray-600 font-medium border border-gray-200">
                      +91
                    </div>
                    <input
                      type="tel" maxLength={10} placeholder="10-digit mobile number"
                      value={mobile}
                      onChange={e => { setMobile(e.target.value.replace(/\D/g, '')); setOtpSent(false); setOtp(''); setDevOtp(null); }}
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* OTP display — always shown when OTP is ready */}
                {devOtp && (
                  <div
                    className="flex items-center gap-2 p-4 bg-brand-50 border-2 border-brand-300 rounded-2xl cursor-pointer hover:bg-brand-100 transition-colors"
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
                  <Button className="w-full" size="lg" loading={sendOtpMut.isPending}
                    disabled={mobile.length !== 10}
                    onClick={() => sendOtpMut.mutate()}>
                    Send OTP
                  </Button>
                ) : (
                  <div className="space-y-4">
                    {/* OTP input — plain single field, works everywhere */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block text-center">
                        Enter the 6-digit OTP sent to +91{mobile}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
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

                    <Button className="w-full" size="lg" loading={verifyOtpMut.isPending}
                      disabled={otp.length !== 6}
                      onClick={() => verifyOtpMut.mutate()}>
                      Verify OTP
                    </Button>

                    <div className="flex items-center justify-between">
                      <button type="button"
                        disabled={timer > 0}
                        onClick={() => { setOtpSent(false); setOtp(''); setDevOtp(null); }}
                        className="text-sm text-brand-600 disabled:text-gray-400 hover:underline disabled:no-underline">
                        Change number
                      </button>
                      {timer > 0
                        ? <span className="text-sm text-gray-400">Resend in {timer}s</span>
                        : <button type="button" onClick={() => { setOtp(''); sendOtpMut.mutate(); }}
                            className="text-sm text-brand-600 hover:underline">
                            Resend OTP
                          </button>
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 1: Personal Info ──────────────────── */}
            {step === 1 && (
              <form className="space-y-4"
                onSubmit={personalForm.handleSubmit(() => setStep(2))}>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Personal Details</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Tell us about yourself</p>
                </div>
                <Input label="Full Name" placeholder="Rahul Sharma"
                  {...personalForm.register('fullName')}
                  error={personalForm.formState.errors.fullName?.message as string}
                  required />
                <Input label="Email Address" type="email" placeholder="rahul@example.com"
                  {...personalForm.register('email')}
                  error={personalForm.formState.errors.email?.message as string} />
                <Input label="Address" placeholder="House No, Street"
                  {...personalForm.register('address')} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="City" placeholder="Mumbai"
                    {...personalForm.register('city')}
                    error={personalForm.formState.errors.city?.message as string} required />
                  <Input label="State" placeholder="Maharashtra"
                    {...personalForm.register('state')}
                    error={personalForm.formState.errors.state?.message as string} required />
                </div>
                <Input label="PIN Code" placeholder="400001" maxLength={6}
                  {...personalForm.register('pinCode')}
                  error={personalForm.formState.errors.pinCode?.message as string} required />
                <StepNavButtons step={step} onBack={() => setStep(0)} />
              </form>
            )}

            {/* ── STEP 2: Vehicle Details ────────────────── */}
            {step === 2 && (
              <form className="space-y-4"
                onSubmit={vehicleForm.handleSubmit(() => setStep(3))}>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Vehicle Details</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Enter your vehicle registration info</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Registration Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...vehicleForm.register('registrationNumber')}
                    placeholder="MH12AB1234"
                    onChange={e => vehicleForm.setValue('registrationNumber', e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {vehicleForm.formState.errors.registrationNumber && (
                    <p className="text-xs text-red-500 mt-1">{vehicleForm.formState.errors.registrationNumber.message as string}</p>
                  )}
                </div>
                <Select label="Vehicle Type" options={VEHICLE_TYPES}
                  {...vehicleForm.register('vehicleType')}
                  error={vehicleForm.formState.errors.vehicleType?.message as string} required />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Make" placeholder="Hyundai"
                    {...vehicleForm.register('make')}
                    error={vehicleForm.formState.errors.make?.message as string} required />
                  <Input label="Model" placeholder="Creta"
                    {...vehicleForm.register('model')}
                    error={vehicleForm.formState.errors.model?.message as string} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Color" placeholder="White"
                    {...vehicleForm.register('color')}
                    error={vehicleForm.formState.errors.color?.message as string} required />
                  <Input label="Year" placeholder="2022" maxLength={4}
                    {...vehicleForm.register('manufacturingYear')}
                    error={vehicleForm.formState.errors.manufacturingYear?.message as string} required />
                </div>
                <Select label="Fuel Type" options={FUEL_TYPES}
                  {...vehicleForm.register('fuelType')}
                  error={vehicleForm.formState.errors.fuelType?.message as string} required />
                <StepNavButtons step={step} onBack={() => setStep(1)} />
              </form>
            )}

            {/* ── STEP 3: Emergency Contact ──────────────── */}
            {step === 3 && (
              <form className="space-y-4"
                onSubmit={emergencyForm.handleSubmit(() => setStep(4))}>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Emergency Contact</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Who should we contact in an emergency?</p>
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-700">
                    This person will receive emergency alerts if someone triggers SOS from your vehicle's tag.
                  </p>
                </div>
                <Input label="Contact Name" placeholder="Priya Sharma"
                  {...emergencyForm.register('emergencyName')}
                  error={emergencyForm.formState.errors.emergencyName?.message as string} required />
                <Input label="Contact Mobile" type="tel" placeholder="9876543210" maxLength={10}
                  {...emergencyForm.register('emergencyMobile')}
                  error={emergencyForm.formState.errors.emergencyMobile?.message as string} required />
                <Input label="Relationship" placeholder="Spouse / Parent / Friend"
                  {...emergencyForm.register('emergencyRelationship')}
                  error={emergencyForm.formState.errors.emergencyRelationship?.message as string} required />
                <StepNavButtons step={step} onBack={() => setStep(2)} />
              </form>
            )}

            {/* ── STEP 4: Document Upload ────────────────── */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Upload Documents</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Upload RC, Insurance, and PUC certificates</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex gap-2">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Documents are stored securely and can only be viewed with your 4-digit PIN.
                    All files are optional but recommended.
                  </p>
                </div>
                <div className="space-y-2.5">
                  <DocUploadRow label="RC (Registration Certificate)" docKey="rc"
                    file={files.rc}
                    onChange={f => setFiles(p => ({ ...p, rc: f }))}
                    onRemove={() => setFiles(p => ({ ...p, rc: undefined }))} />
                  <DocUploadRow label="Insurance Certificate" docKey="insurance"
                    file={files.insurance}
                    onChange={f => setFiles(p => ({ ...p, insurance: f }))}
                    onRemove={() => setFiles(p => ({ ...p, insurance: undefined }))} />
                  <DocUploadRow label="PUC Certificate" docKey="puc"
                    file={files.puc}
                    onChange={f => setFiles(p => ({ ...p, puc: f }))}
                    onRemove={() => setFiles(p => ({ ...p, puc: undefined }))} />
                </div>
                {docCount === 0 && (
                  <p className="text-xs text-gray-400 text-center">
                    You can also upload documents later from your dashboard.
                  </p>
                )}
                <StepNavButtons step={step} onBack={() => setStep(3)} label="Continue" noSubmit onClick={() => setStep(5)} />
              </div>
            )}

            {/* ── STEP 5: PIN ────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Create Security PIN</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    This 4-digit PIN protects your documents from public access
                  </p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex gap-2">
                  <Lock className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-700">
                    Anyone who scans your QR code will need this PIN to view your RC, Insurance, and PUC documents.
                    Keep it safe — it cannot be recovered.
                  </p>
                </div>

                {/* PIN Input */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Create 4-digit PIN <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric" maxLength={4} placeholder="••••"
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button type="button" onClick={() => setShowPin(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm PIN */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Confirm PIN <span className="text-red-500">*</span></label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric" maxLength={4} placeholder="••••"
                    value={pinConfirm}
                    onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className={`w-full border rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 ${
                      pinConfirm && pin !== pinConfirm
                        ? 'border-red-400 bg-red-50 focus:ring-red-400'
                        : 'border-gray-300 focus:ring-brand-500'
                    }`}
                  />
                  {pinConfirm && pin !== pinConfirm && (
                    <p className="text-xs text-red-500 mt-1">PINs do not match</p>
                  )}
                  {pin.length === 4 && pinConfirm.length === 4 && pin === pinConfirm && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> PINs match
                    </p>
                  )}
                </div>

                <StepNavButtons step={step} onBack={() => setStep(4)}
                  label="Review & Activate"
                  disabled={pin.length !== 4 || pin !== pinConfirm}
                  onClick={() => setStep(6)} noSubmit />
              </div>
            )}

            {/* ── STEP 6: Review ─────────────────────────── */}
            {step === 6 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Review & Activate</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Please confirm all details before activating</p>
                </div>

                {/* Customer */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Customer
                    </span>
                  </div>
                  <div className="px-4 py-2">
                    <ReviewRow label="Name"    value={pV.fullName ?? ''} />
                    <ReviewRow label="Mobile"  value={`+91 ${mobile}`} />
                    <ReviewRow label="Email"   value={pV.email ?? ''} />
                    <ReviewRow label="City"    value={`${pV.city ?? ''}, ${pV.state ?? ''}`} />
                    <ReviewRow label="PIN Code" value={pV.pinCode ?? ''} />
                  </div>
                </div>

                {/* Vehicle */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Car className="w-3 h-3" /> Vehicle
                    </span>
                  </div>
                  <div className="px-4 py-2">
                    <ReviewRow label="Reg. No."  value={vV.registrationNumber?.toUpperCase() ?? ''} />
                    <ReviewRow label="Make/Model" value={`${vV.make ?? ''} ${vV.model ?? ''}`} />
                    <ReviewRow label="Color/Year" value={`${vV.color ?? ''} · ${vV.manufacturingYear ?? ''}`} />
                    <ReviewRow label="Fuel"       value={vV.fuelType ?? ''} />
                  </div>
                </div>

                {/* Emergency */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" /> Emergency Contact
                    </span>
                  </div>
                  <div className="px-4 py-2">
                    <ReviewRow label="Name"         value={eV.emergencyName ?? ''} />
                    <ReviewRow label="Mobile"        value={`+91 ${eV.emergencyMobile ?? ''}`} />
                    <ReviewRow label="Relationship"  value={eV.emergencyRelationship ?? ''} />
                  </div>
                </div>

                {/* Documents & PIN */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3 h-3" /> Documents & PIN
                    </span>
                  </div>
                  <div className="px-4 py-2">
                    <ReviewRow label="RC"        value={files.rc        ? `✓ ${files.rc.name}`        : 'Not uploaded'} />
                    <ReviewRow label="Insurance"  value={files.insurance ? `✓ ${files.insurance.name}` : 'Not uploaded'} />
                    <ReviewRow label="PUC"        value={files.puc       ? `✓ ${files.puc.name}`       : 'Not uploaded'} />
                    <ReviewRow label="PIN"        value="••••" />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(5)}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    className="flex-2 flex-grow-[2]"
                    loading={activateMut.isPending}
                    onClick={() => activateMut.mutate()}
                  >
                    <Shield className="w-4 h-4" />
                    Activate Safety Tag
                  </Button>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  By activating, you agree to our terms. Your data is stored securely.
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-white/40 text-xs mt-4">
          Car Deal Smart Safety Tag — Secure vehicle registration
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SHARED NAV BUTTONS
// ─────────────────────────────────────────────────────────────

function StepNavButtons({
  step, onBack, label = 'Next', disabled = false, onClick, noSubmit = false,
}: {
  step: number; onBack: () => void; label?: string;
  disabled?: boolean; onClick?: () => void; noSubmit?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-1">
      <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
        <ChevronLeft className="w-4 h-4" /> Back
      </Button>
      <Button
        type={noSubmit ? 'button' : 'submit'}
        className="flex-1"
        disabled={disabled}
        onClick={onClick}
      >
        {label} <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
