import { useEffect, useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, Check, Edit2, ShieldCheck, LogOut, Trash2 } from 'lucide-react';
import { cancelMembership, changePassword, deleteAccount, getUserProfile } from '../services/authService';
import RenewMembershipModal from '../components/RenewMembershipModal';

function formatMembershipName(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'basico' || normalized === 'básico' || normalized === 'basic') {
    return 'Básico';
  }

  if (normalized === 'premium') {
    return 'Premium';
  }

  if (normalized === 'gratis' || normalized === 'free') {
    return 'Gratis';
  }

  return 'Gratis';
}
 
function normalizePaymentStatus(value) {
  const normalized = String(value || 'approved').trim().toLowerCase();
  return normalized === 'rejected' ? 'denied' : normalized;
}

export default function ProfileView({ onLogout, onAccountDeleted, user }) {
  const [fullName] = useState(user?.name || 'Seba');
  const [email] = useState(user?.email || 'seba@riqssi.forensic');
  const [roleName] = useState(String(user?.role || 'USER').toUpperCase());
  const isAdmin = roleName === 'ADMIN';
  const [membershipName, setMembershipName] = useState(isAdmin ? 'Premium' : formatMembershipName(user?.membership?.nombre));
  const [paymentStatus, setPaymentStatus] = useState(() => normalizePaymentStatus(user?.payment_status));
  const [membershipExpiration, setMembershipExpiration] = useState(user?.membership_expiration || null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      const username = user?.nombreuser || user?.username;
      if (!username) {
        return;
      }

      try {
        const data = await getUserProfile(username);
        if (!cancelled) {
          setMembershipName(isAdmin ? 'Premium' : formatMembershipName(data?.membership?.nombre));
          setPaymentStatus(normalizePaymentStatus(data?.payment_status));
          setMembershipExpiration(isAdmin ? null : data?.membership_expiration || null);
        }
      } catch {
        if (!cancelled) {
          setMembershipName(isAdmin ? 'Premium' : formatMembershipName(user?.membership?.nombre));
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, user?.membership?.nombre, user?.nombreuser, user?.username]);

  const avatarText = (user?.username || user?.name || user?.email || 'RI')
    .trim()
    .slice(0, 2)
    .toUpperCase();
 
  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await changePassword({ correo: email, nueva_clave: password });
      setIsSaved(true);
      setPassword('');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña');
    }
  };

  const handleCancelMembership = async () => {
    const username = user?.nombreuser || user?.username;
    if (!username || !['Básico', 'Premium'].includes(membershipName)) {
      return;
    }

    if (!window.confirm('¿Deseas cancelar tu membresía? Perderás el acceso a las funciones avanzadas.')) {
      return;
    }

    try {
      setIsCancelling(true);
      await cancelMembership(username);
      setMembershipName('Gratis');
      setPaymentStatus('canceled');
      setMembershipExpiration(null);
    } catch (err) {
      setError(err.message || 'No se pudo cancelar la membresía');
    } finally {
      setIsCancelling(false);
    }
  };

  const renewalPlan = { 'Básico': 'basico', 'Premium': 'premium' }[membershipName] || 'basico';

  const handleDeleteAccount = async () => {
    setError('');

    const confirmed = window.confirm(
      'Esta acción eliminará tu cuenta y todos los datos asociados de forma permanente. ¿Deseas continuar?'
    );

    if (!confirmed) {
      return;
    }

    const username = user?.nombreuser || user?.username;
    if (!username) {
      setError('No se pudo identificar la cuenta para eliminarla');
      return;
    }

    try {
      setIsDeleting(true);
      await deleteAccount(username);
      (onAccountDeleted || onLogout)();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la cuenta');
    } finally {
      setIsDeleting(false);
    }
  };
 
  return (
    <div className="container mx-auto px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-sm relative">
        <h1 className="text-3xl font-extrabold text-slate-900 text-center mb-2 tracking-tight" style={{ color: '#2563eb' }}>
          Ajustes de Perfil
        </h1>
        <p className="text-slate-500 text-sm text-center mb-8">
          Actualiza tu información personal y cuenta
        </p>
 
        {/* User Card */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
              {user?.initials || avatarText}
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 shadow-sm hover:text-blue-600 transition-colors">
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-bold text-slate-900"  style={{ color: '#2563eb' }}>{fullName}</h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Miembro desde enero 2024
            </p>
          </div>
        </div>
 
        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Inputs Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" htmlFor="fullName">
              Nombre Completo
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="h-5 w-5" />
              </span>
              <input
                className="block w-full bg-slate-100 border border-slate-200 rounded-lg py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 transition-all outline-none cursor-not-allowed"
                id="fullName"
                type="text"
                value={fullName}
                readOnly
              />
            </div>
          </div>
 
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" htmlFor="email">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail className="h-5 w-5" />
              </span>
              <input
                className="block w-full bg-slate-100 border border-slate-200 rounded-lg py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 transition-all outline-none cursor-not-allowed"
                id="email"
                type="email"
                value={email}
                readOnly
              />
            </div>
          </div>
 
          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" htmlFor="password">
              Nueva Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="h-5 w-5" />
              </span>
              <input
                className="block w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-10 pr-10 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none"
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingresa tu nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 cursor-pointer hover:text-blue-600 outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
 
          {/* Plan & Type Information box */}
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-5 flex flex-col py-4 px-6 sm:flex-row sm:items-center justify-between gap-4 text-sm mt-4">
            <div className="flex items-center justify-between sm:justify-start gap-4 w-full">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rol</span>
              <span className={`px-3 py-1 text-white text-[10px] font-bold rounded uppercase tracking-wider ${roleName === 'ADMIN' ? 'bg-emerald-600' : 'bg-slate-500'}`}>
                {roleName}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-6 py-4 text-sm">
            <div>
              <span className="block text-xs font-bold uppercase tracking-widest text-slate-400">Estado del pago</span>
              <span className="mt-1 block font-semibold text-slate-700">{paymentStatus === 'canceled' ? 'Cancelada · plan Gratis' : paymentStatus === 'expired' ? 'Expirada · plan Gratis' : paymentStatus === 'denied' ? 'Denegado' : paymentStatus === 'pending' ? 'Pendiente de aprobación · plan Gratis' : 'Aprobado'}</span>
            </div>
            {!isAdmin && ['Básico', 'Premium'].includes(membershipName) ? (
              <button type="button" onClick={handleCancelMembership} disabled={isCancelling} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">
                {isCancelling ? 'Cancelando...' : 'Cancelar suscripción'}
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-6 py-4 text-sm text-slate-700">
            <div>
              <span className="block text-xs font-bold uppercase tracking-widest text-slate-400">Fecha de vencimiento</span>
              <span className="mt-1 block font-semibold">
                {isAdmin
                  ? 'Sin vencimiento (Premium permanente)'
                  : membershipExpiration
                    ? new Date(membershipExpiration).toLocaleDateString()
                    : 'Sin vencimiento'}
              </span>
            </div>
            {!isAdmin ? (
              <button type="button" onClick={() => setShowRenewModal(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Renovar Membresía
              </button>
            ) : null}
          </div>

          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-5 flex flex-col py-4 px-6 sm:flex-row sm:items-center justify-between gap-4 text-sm mt-4">
            <div className="flex items-center justify-between sm:justify-start gap-4 w-full">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Membresía actual</span>
              <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                {membershipName}
              </span>
            </div>
          </div>
 
          {/* Submit Button */}
          <div className="pt-2 flex flex-col items-center gap-4">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-blue-600/10 active:scale-[0.99]"
            >
              {isSaved ? (
                <>
                  <Check className="h-5 w-5" />
                  ¡Cambios Guardados!
                </>
              ) : (
                'Actualizar contraseña'
              )}
            </button>
 
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 text-slate-500 hover:text-red-600 text-sm font-semibold transition-colors mt-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>

            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="w-full flex items-center justify-center gap-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed font-bold py-3.5 px-6 rounded-xl transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Eliminando cuenta...' : 'Eliminar cuenta'}
            </button>
          </div>
        </form>
 
        {/* Secure badge footer */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-widest font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Sistema RIQSSI Protegido
        </div>
      </div>

      {showRenewModal ? (
        <RenewMembershipModal
          nombreuser={user?.nombreuser || user?.username}
          defaultPlan={renewalPlan}
          onClose={() => setShowRenewModal(false)}
        />
      ) : null}
    </div>
  );
}
 