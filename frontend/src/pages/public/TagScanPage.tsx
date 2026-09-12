import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { tagApi, sosApi, callApi } from '../../services/api';
import { useState } from 'react';
import {
  Phone, AlertTriangle, Lock, Shield, Loader2,
  CheckCircle, XCircle, Clock, Car, ChevronRight,
  MapPin, Navigation, Fuel, Truck, Wrench, Siren,
  ShieldAlert, Star, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../utils/helpers';
import { DocumentAccessModal } from './DocumentAccessModal';

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function ExpiryPill({ label, color, date }: { label: string; color: string; date: string }) {
  const map: Record<string, string> = {
    GREEN:   'bg-green-500/20 text-green-200 border-green-500/30',
    YELLOW:  'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
    ORANGE:  'bg-orange-500/20 text-orange-200 border-orange-500/30',
    RED:     'bg-red-500/20 text-red-200 border-red-500/30',
    EXPIRED: 'bg-red-800/30 text-red-300 border-red-700/40',
  };
  return (
    <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs ${map[color] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
      <span className="font-medium">{label}</span>
      <span>{color === 'EXPIRED' ? 'EXPIRED' : formatDate(date)}</span>
    </div>
  );
}

function TagErrorPage({
  icon, title, subtitle, tagId,
}: { icon: React.ReactNode; title: string; subtitle: string; tagId?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-white/60 text-sm mt-1">{subtitle}</p>
        </div>
        {tagId && (
          <p className="font-mono text-xs text-white/30 bg-white/5 rounded-lg px-3 py-1.5">{tagId}</p>
        )}
        <p className="text-white/40 text-xs">
          Need help? Contact Car Deal support.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BREAKDOWN SERVICE GRID
// ─────────────────────────────────────────────────────────────

const SERVICES = [
  { key: 'MECHANIC',           icon: Wrench,     label: 'Mechanic',   sub: 'Engine / brakes' },
  { key: 'TOWING',             icon: Truck,      label: 'Towing',     sub: 'Vehicle tow'     },
  { key: 'FUEL_DELIVERY',      icon: Fuel,       label: 'Fuel',       sub: 'Out of fuel'     },
  { key: 'AMBULANCE',          icon: Siren,      label: 'Ambulance',  sub: '108 / Medical'   },
  { key: 'POLICE',             icon: ShieldAlert,label: 'Police',     sub: '100 / Accident'  },
  { key: 'ROADSIDE_ASSISTANCE',icon: Navigation, label: 'Roadside',   sub: 'General help'    },
];

const BREAKDOWN_TYPES: Record<string, Array<{ value: string; label: string }>> = {
  MECHANIC:            [{ value:'TYRE_PUNCTURE', label:'Tyre Puncture' }, { value:'ENGINE_FAILURE', label:'Engine Problem' }, { value:'BRAKE_FAILURE', label:'Brake Issue' }, { value:'ELECTRICAL_ISSUE', label:'Electrical' }, { value:'OVERHEATING', label:'Overheating' }, { value:'OTHER', label:'Other' }],
  TOWING:              [{ value:'ACCIDENT', label:'Accident' }, { value:'ENGINE_FAILURE', label:'Engine Dead' }, { value:'OTHER', label:'Need Tow' }],
  FUEL_DELIVERY:       [{ value:'FUEL_EMPTY', label:'Out of Fuel' }, { value:'BATTERY_DEAD', label:'Battery Dead' }],
  AMBULANCE:           [{ value:'ACCIDENT', label:'Accident / Injury' }, { value:'OTHER', label:'Medical Emergency' }],
  POLICE:              [{ value:'ACCIDENT', label:'Road Accident' }, { value:'OTHER', label:'Police Help' }],
  ROADSIDE_ASSISTANCE: [{ value:'BATTERY_DEAD', label:'Jump Start' }, { value:'TYRE_PUNCTURE', label:'Tyre Change' }, { value:'OTHER', label:'General Help' }],
};

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

export default function TagScanPage() {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate  = useNavigate();

  // Modal states
  const [callOpen,      setCallOpen]      = useState(false);
  const [sosConfirm,    setSosConfirm]    = useState(false);
  const [docOpen,       setDocOpen]       = useState(false);
  const [bdOpen,        setBdOpen]        = useState(false);
  const [bdService,     setBdService]     = useState<typeof SERVICES[0] | null>(null);
  const [bdType,        setBdType]        = useState('');
  const [bdStep,        setBdStep]        = useState<'service' | 'type' | 'form'>('service');
  const [callerName,    setCallerName]    = useState('');
  const [callerNum,     setCallerNum]     = useState('');
  const [callerErr,     setCallerErr]     = useState('');
  const [bdDesc,        setBdDesc]        = useState('');
  const [sosTriggered,  setSosTriggered]  = useState(false);
  const [ratingOpen,    setRatingOpen]    = useState(false);
  const [ratingScore,   setRatingScore]   = useState(0);
  const [bdResult,      setBdResult]      = useState<any>(null);

  // ── Fetch tag status (source of truth = backend) ──────────
  const { data, isLoading, error } = useQuery({
    queryKey: ['tag-scan', tagId],
    queryFn:  () => tagApi.scan(tagId!).then(r => r.data.data),
    retry: false,
    staleTime: 0, // always fresh — never trust cached status
  });

  // ── Mutations ─────────────────────────────────────────────

  const sosMut = useMutation({
    mutationFn: () => new Promise<void>((resolve, reject) => {
      setSosConfirm(false);
      toast.loading('Getting your location…', { id: 'sos' });
      const fire = async (lat?: number, lng?: number) => {
        toast.dismiss('sos');
        try {
          await sosApi.trigger(tagId!, lat, lng);
          resolve();
        } catch (e) { reject(e); }
      };
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          p => fire(p.coords.latitude, p.coords.longitude),
          () => fire(),
          { timeout: 8000 }
        );
      } else { fire(); }
    }),
    onSuccess: () => { setSosTriggered(true); toast.success('🚨 Emergency alert sent!'); },
    onError:   () => toast.error('Failed to send SOS'),
  });

  const callMut = useMutation({
    mutationFn: () => callApi.initiate(tagId!, callerNum),
    onSuccess: () => { setCallOpen(false); toast.success('📞 Call initiated — you\'ll receive a call shortly'); },
    onError:   () => toast.error('Could not initiate call'),
  });

  const bdMut = useMutation({
    mutationFn: async () => {
      const { breakdownApi } = await import('../../services/api');
      return new Promise<any>((resolve, reject) => {
        const fire = async (lat?: number, lng?: number) => {
          try {
            const res = await breakdownApi.create({
              tagId, breakdownType: bdType, serviceType: bdService!.key,
              callerName, callerMobile: callerNum, description: bdDesc,
              latitude: lat, longitude: lng,
            });
            resolve(res.data.data);
          } catch (e) { reject(e); }
        };
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            p => fire(p.coords.latitude, p.coords.longitude),
            () => fire(), { timeout: 8000 }
          );
        } else { fire(); }
      });
    },
    onSuccess: (data) => { setBdResult(data); setBdOpen(false); toast.success('Help request sent!'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Request failed'),
  });

  // ── Loading ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto" />
          <p className="text-white/60 text-sm">Checking tag status…</p>
        </div>
      </div>
    );
  }

  // ── Error / not found ─────────────────────────────────────
  if (error || !data) {
    return (
      <TagErrorPage
        icon={<XCircle className="w-8 h-8 text-red-400" />}
        title="Tag Not Found"
        subtitle="This QR code is invalid or does not exist."
        tagId={tagId}
      />
    );
  }

  const { status, vehicle } = data;

  // ── UNASSIGNED → Activate ─────────────────────────────────
  if (status === 'UNASSIGNED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-700 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Smart Safety Tag</h1>
            <p className="text-blue-200 text-sm mt-1">Ready to activate</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-500">Tag ID</span>
              <span className="font-mono font-bold text-brand-600">{tagId}</span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /><span>Emergency SOS with GPS location</span></div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /><span>Masked calling to vehicle owner</span></div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /><span>PIN-protected document access</span></div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /><span>Roadside assistance services</span></div>
            </div>
            <Button className="w-full" size="lg" onClick={() => navigate(`/activate/${tagId}`)}>
              Activate This Tag →
            </Button>
            <p className="text-xs text-gray-400 text-center">Free • Takes 2 minutes • No hidden charges</p>
          </div>
        </div>
      </div>
    );
  }

  // ── BLOCKED ───────────────────────────────────────────────
  if (status === 'BLOCKED') {
    return (
      <TagErrorPage
        icon={<XCircle className="w-8 h-8 text-red-400" />}
        title="Tag Blocked"
        subtitle="This safety tag has been blocked. Please contact Car Deal support for assistance."
        tagId={tagId}
      />
    );
  }

  // ── INACTIVE ──────────────────────────────────────────────
  if (status === 'INACTIVE') {
    return (
      <TagErrorPage
        icon={<Clock className="w-8 h-8 text-yellow-400" />}
        title="Tag Inactive"
        subtitle="This tag is currently inactive. The vehicle owner may have deactivated it."
        tagId={tagId}
      />
    );
  }

  // ── EXPIRED ───────────────────────────────────────────────
  if (status === 'EXPIRED') {
    return (
      <TagErrorPage
        icon={<Clock className="w-8 h-8 text-orange-400" />}
        title="Tag Expired"
        subtitle="This safety tag has expired. Please contact the vehicle owner."
        tagId={tagId}
      />
    );
  }

  // ── ACTIVE → Public Safety Page ───────────────────────────
  if (!vehicle) {
    return (
      <TagErrorPage
        icon={<Car className="w-8 h-8 text-gray-400" />}
        title="No Vehicle Linked"
        subtitle="This tag is active but has no vehicle linked. Please contact support."
        tagId={tagId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950">
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <span className="text-white font-semibold text-sm">Car Deal Safety</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="font-mono text-xs text-green-300">{tagId} · ACTIVE</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4 pb-10">

        {/* ── Vehicle Card ────────────────────────────────── */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500/20 border border-blue-400/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Car className="w-6 h-6 text-blue-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-3xl font-bold text-white tracking-widest font-mono">
                {vehicle.registrationNumber}
              </p>
              <p className="text-blue-200 text-sm mt-0.5">
                {vehicle.make} {vehicle.model} · {vehicle.color}
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                {vehicle.vehicleType?.replace(/_/g, ' ')} · {vehicle.fuelType} · {vehicle.manufacturingYear}
              </p>
            </div>
          </div>

          {/* Expiry badges */}
          {(vehicle.insuranceRecord || vehicle.pucRecord) && (
            <div className="space-y-1.5 pt-1 border-t border-white/10">
              {vehicle.insuranceRecord && (
                <ExpiryPill label="Insurance" color={vehicle.insuranceRecord.expiryColor} date={vehicle.insuranceRecord.expiryDate} />
              )}
              {vehicle.pucRecord && (
                <ExpiryPill label="PUC" color={vehicle.pucRecord.expiryColor} date={vehicle.pucRecord.expiryDate} />
              )}
            </div>
          )}
        </div>

        {/* ── Breakdown result card ────────────────────────── */}
        {bdResult && (
          <div className="bg-green-500/20 border border-green-400/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-green-300 font-semibold">Help Request Sent!</p>
              <span className="ml-auto font-mono text-xs text-green-300 bg-green-900/30 px-2 py-0.5 rounded">
                #{bdResult.shortId}
              </span>
            </div>
            <p className="text-white/70 text-sm">{bdResult.message}</p>
            {bdResult.mapLink && (
              <a href={bdResult.mapLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-blue-300 text-sm hover:underline">
                <MapPin className="w-4 h-4" /> Your shared location
              </a>
            )}
            <button onClick={() => setRatingOpen(true)}
              className="w-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded-xl py-2 text-sm font-medium hover:bg-yellow-500/30 transition-colors">
              ⭐ Rate this service
            </button>
          </div>
        )}

        {/* ── SOS Button ──────────────────────────────────── */}
        {sosTriggered ? (
          <div className="bg-green-500/20 border border-green-400/30 rounded-2xl p-4 text-center space-y-1">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
            <p className="text-green-300 font-bold">SOS Alert Sent!</p>
            <p className="text-white/50 text-xs">Emergency contact notified with your GPS location</p>
          </div>
        ) : (
          <button
            onClick={() => setSosConfirm(true)}
            disabled={sosMut.isPending}
            className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-2xl p-5 flex items-center justify-center gap-3 font-bold text-xl shadow-xl shadow-red-900/50 transition-all border border-red-500 disabled:opacity-70"
          >
            <AlertTriangle className="w-7 h-7" />
            {sosMut.isPending ? 'Sending SOS…' : '🚨 EMERGENCY SOS'}
          </button>
        )}

        {/* ── Quick Action Buttons ─────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: Phone, label: 'Call Owner', sub: 'Masked',
              color: 'bg-green-500/20 border-green-500/30 text-green-300',
              onClick: () => setCallOpen(true),
            },
            {
              icon: Lock, label: 'Documents', sub: 'PIN Protected',
              color: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
              onClick: () => setDocOpen(true),
            },
            {
              icon: Wrench, label: 'Get Help', sub: 'Roadside',
              color: 'bg-orange-500/20 border-orange-500/30 text-orange-300',
              onClick: () => { setBdStep('service'); setBdOpen(true); },
            },
          ].map(({ icon: Icon, label, sub, color, onClick }) => (
            <button key={label} onClick={onClick}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border active:scale-95 transition-all ${color}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-white text-xs font-semibold">{label}</p>
              <p className="text-white/40 text-xs">{sub}</p>
            </button>
          ))}
        </div>

        {/* ── Roadside Service Grid ────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-white font-semibold text-sm">🛣️ Roadside Services</p>
          </div>
          <div className="grid grid-cols-3 gap-px bg-white/5">
            {SERVICES.map(svc => (
              <button key={svc.key}
                onClick={() => { setBdService(svc); setBdType(''); setBdStep('type'); setBdOpen(true); }}
                className="flex flex-col items-center gap-1.5 p-4 bg-slate-900/60 hover:bg-white/5 transition-colors active:scale-95">
                <svc.icon className="w-5 h-5 text-white/70" />
                <p className="text-white text-xs font-medium">{svc.label}</p>
                <p className="text-white/40 text-xs">{svc.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Emergency Numbers ────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-white font-semibold text-sm">📞 Emergency Helplines</p>
          </div>
          <div className="divide-y divide-white/5">
            {[
              { label: '🚑 Ambulance',        number: '108' },
              { label: '🚔 Police',            number: '100' },
              { label: '🔥 Fire Brigade',      number: '101' },
              { label: '🛣️ Highway Helpline',  number: '1033' },
              { label: '👩 Women Safety',       number: '1091' },
            ].map(({ label, number }) => (
              <a key={number} href={`tel:${number}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                <span className="text-white/70 text-sm">{label}</span>
                <span className="text-blue-300 font-bold text-lg">{number}</span>
              </a>
            ))}
          </div>
        </div>

        <p className="text-center text-white/20 text-xs">Powered by Car Deal Smart Safety Tag</p>
      </div>

      {/* ── SOS Confirm Modal ────────────────────────────────── */}
      <Modal open={sosConfirm} onClose={() => setSosConfirm(false)} title="⚠️ Confirm Emergency SOS" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          This will send an emergency alert with your GPS location to the vehicle's emergency contact.
          Only use this in a real emergency.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setSosConfirm(false)}>Cancel</Button>
          <Button variant="danger" className="flex-1" loading={sosMut.isPending} onClick={() => sosMut.mutate()}>
            Send SOS
          </Button>
        </div>
      </Modal>

      {/* ── Call Owner Modal ─────────────────────────────────── */}
      <Modal open={callOpen} onClose={() => setCallOpen(false)} title="📞 Call Vehicle Owner">
        <p className="text-sm text-gray-500 mb-4">
          Enter your mobile number to call the owner via a masked number — both numbers stay private.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Your Mobile Number</label>
            <input type="tel" maxLength={10} placeholder="10-digit mobile"
              value={callerNum}
              onChange={e => { setCallerNum(e.target.value.replace(/\D/g, '')); setCallerErr(''); }}
              className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {callerErr && <p className="text-xs text-red-500 mt-1">{callerErr}</p>}
          </div>
          <Button className="w-full" loading={callMut.isPending}
            onClick={() => {
              if (!/^[6-9]\d{9}$/.test(callerNum)) { setCallerErr('Enter a valid 10-digit number'); return; }
              callMut.mutate();
            }}>
            <Phone className="w-4 h-4" /> Initiate Masked Call
          </Button>
        </div>
      </Modal>

      {/* ── Roadside / Breakdown Modal ───────────────────────── */}
      <Modal open={bdOpen} onClose={() => setBdOpen(false)}
        title={bdStep === 'service' ? '🛣️ What help do you need?' : bdStep === 'type' ? `${bdService?.label} — Select Issue` : `Request ${bdService?.label}`}
        size="md">

        {bdStep === 'service' && (
          <div className="grid grid-cols-2 gap-3">
            {SERVICES.map(svc => (
              <button key={svc.key}
                onClick={() => { setBdService(svc); setBdType(''); setBdStep('type'); }}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-all text-left">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <svc.icon className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{svc.label}</p>
                  <p className="text-xs text-gray-500">{svc.sub}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {bdStep === 'type' && bdService && (
          <div className="space-y-2">
            <button onClick={() => setBdStep('service')} className="text-sm text-brand-600 hover:underline mb-1 block">← Back</button>
            {(BREAKDOWN_TYPES[bdService.key] ?? []).map(t => (
              <button key={t.value}
                onClick={() => { setBdType(t.value); setBdStep('form'); }}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-all text-left">
                <span className="font-medium text-gray-800 text-sm">{t.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        )}

        {bdStep === 'form' && bdService && (
          <div className="space-y-4">
            <button onClick={() => setBdStep('type')} className="text-sm text-brand-600 hover:underline block">← Back</button>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center">
                <bdService.icon className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">{bdService.label}</p>
                <p className="text-xs text-gray-500">{bdType.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Your Name (optional)</label>
              <input value={callerName} onChange={e => setCallerName(e.target.value)}
                placeholder="Enter your name"
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Your Mobile <span className="text-red-500">*</span></label>
              <input type="tel" maxLength={10} placeholder="10-digit mobile"
                value={callerNum}
                onChange={e => { setCallerNum(e.target.value.replace(/\D/g, '')); setCallerErr(''); }}
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500" />
              {callerErr && <p className="text-xs text-red-500 mt-1">{callerErr}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Describe the issue (optional)</label>
              <textarea value={bdDesc} onChange={e => setBdDesc(e.target.value)} rows={2}
                placeholder="Give more details…"
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Your GPS location will be shared automatically
            </p>
            <Button className="w-full" loading={bdMut.isPending}
              onClick={() => {
                if (!/^[6-9]\d{9}$/.test(callerNum)) { setCallerErr('Valid mobile required'); return; }
                bdMut.mutate();
              }}>
              Send Help Request
            </Button>
          </div>
        )}
      </Modal>

      {/* ── Document Modal ────────────────────────────────────── */}
      <DocumentAccessModal open={docOpen} onClose={() => setDocOpen(false)} vehicleId={vehicle.id} tagId={tagId!} />

      {/* ── Rating Modal ──────────────────────────────────────── */}
      <Modal open={ratingOpen} onClose={() => setRatingOpen(false)} title="Rate the Service" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">How was your experience?</p>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRatingScore(s)}>
                <Star className={`w-8 h-8 transition-colors ${s <= ratingScore ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
          <Button className="w-full" disabled={ratingScore === 0}
            onClick={() => { setRatingOpen(false); toast.success('Thank you for your feedback!'); setBdResult(null); }}>
            Submit Rating
          </Button>
        </div>
      </Modal>
    </div>
  );
}
