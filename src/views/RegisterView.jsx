import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Calendar, ArrowRight } from 'lucide-react';
import { View } from '../types';

const PRIMARY_API_URL = import.meta.env.VITE_API_URL || 'https://riqssi-back.onrender.com';
const FALLBACK_API_URL = PRIMARY_API_URL.includes('localhost')
  ? PRIMARY_API_URL.replace('localhost', '127.0.0.1')
  : PRIMARY_API_URL.replace('127.0.0.1', 'localhost');
const API_URLS = PRIMARY_API_URL === FALLBACK_API_URL ? [PRIMARY_API_URL] : [PRIMARY_API_URL, FALLBACK_API_URL];

export default function RegisterView({ setView }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [plan, setPlan] = useState('gratis');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [operationCode, setOperationCode] = useState('');
  const [proof, setProof] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let lastError = null;
      let data = null;

      for (const apiUrl of API_URLS) {
        try {
          const response = await fetch(`${apiUrl}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nombre_usuario: username,
              nombre: firstName,
              apellido: lastName,
              correo: email,
              clave: password,
              fecha_nacimiento: birthDate,
              plan,
              membresia: plan,
            }),
          });

          data = await response.json();

          if (!response.ok) {
            throw new Error(data.detail || 'No se pudo completar el registro');
          }

          break;
        } catch (error) {
          lastError = error;
          data = null;
        }
      }

      if (!data) {
        throw new Error(lastError?.message || 'No se pudo completar el registro');
      }

      if (data.user?.payment_status === 'pending') {
        setRegistration(data.user);
      } else {
        setView(View.LOGIN);
      }
    } catch (err) {
      setError(err.message || 'Error inesperado al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    setPaymentMessage('');
    if (!proof || !operationCode.trim()) {
      setPaymentMessage('Adjunta el comprobante y escribe el código de operación.');
      return;
    }
    const formData = new FormData();
    formData.append('nombreuser', registration.nombreuser);
    formData.append('operation_code', operationCode);
    formData.append('proof', proof);
    try {
      const response = await fetch(`${PRIMARY_API_URL}/membership/payment`, { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'No se pudo enviar el comprobante');
      setPaymentMessage('Comprobante enviado. El administrador revisará tu pago.');
    } catch (submitError) {
      setPaymentMessage(submitError.message);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-[#f8fafc]">
      <div className="w-full max-w-xl bg-white border border-slate-100 rounded-2xl p-8 sm:p-12 text-center shadow-xl">
        <h1 className="text-3xl font-bold mb-2 text-slate-900" style={{ color: '#2563eb' }}>
          Crear cuenta
        </h1>
        <p className="text-slate-500 text-sm mb-10">Acceso al entorno de inteligencia forense RIQSSI</p>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {registration ? (
          <div className="space-y-5 text-left">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Tu cuenta fue creada. Para activar el plan, paga por Yape y envía el comprobante.
            </div>
            <img src={import.meta.env.VITE_YAPE_QR_URL || '/storage/yape/qr.png'} alt="QR de Yape" className="mx-auto h-56 w-56 rounded-lg border border-slate-200 object-contain" />
            <form onSubmit={submitPayment} className="space-y-4">
              <input className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm" placeholder="Código de operación" value={operationCode} onChange={(event) => setOperationCode(event.target.value)} />
              <input className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => setProof(event.target.files?.[0] || null)} />
              {paymentMessage ? <p className="text-sm text-slate-600">{paymentMessage}</p> : null}
              <button className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white" type="submit">Enviar comprobante</button>
              <button className="w-full py-2 text-sm font-semibold text-blue-600" type="button" onClick={() => setView(View.LOGIN)}>Continuar al inicio de sesión</button>
            </form>
          </div>
        ) : <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="firstName">
                Nombre
              </label>
              <input
                className="block w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none"
                id="firstName"
                placeholder="Ej. Juan"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="lastName">
                Apellido
              </label>
              <input
                className="block w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none"
                id="lastName"
                placeholder="Ej. Pérez"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="username">
              Nombre de Usuario
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <span className="text-slate-400 font-semibold select-none ml-1">@</span>
              </span>
              <input
                className="block w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-9 pr-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none"
                id="username"
                placeholder="jperez_forensics"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="email">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail className="h-5 w-5" />
              </span>
              <input
                className="block w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none"
                id="email"
                placeholder="usuario@riqssi.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="h-5 w-5" />
              </span>
              <input
                className="block w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-10 pr-10 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none"
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
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

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="birthDate">
              Fecha de Nacimiento
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Calendar className="h-5 w-5" />
              </span>
              <input
                className="block w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none"
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Selecciona un Plan</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'gratis', label: 'Gratis', price: 'S/0/mes', details: '2 videos · 1 min' },
                { value: 'basico', label: 'Básico', price: 'S/10/mes', details: '5 videos · 3 min' },
                { value: 'premium', label: 'Premium', price: 'S/25/mes', details: 'Ilimitado · 8 min' },
              ].map((option) => {
                return (
                  <label
                    className="cursor-pointer"
                    key={option.value}
                  >
                    <input
                      className="hidden peer"
                      type="radio"
                      name="plan"
                      value={option.value}
                      checked={plan === option.value}
                      disabled={false}
                      onChange={(e) => setPlan(e.target.value)}
                    />
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 transition-all peer-checked:border-blue-600 peer-checked:ring-2 peer-checked:ring-blue-600 peer-checked:bg-white">
                      <span className="text-sm font-bold">{option.label}</span>
                      <span className="text-xs text-slate-500">{option.price}</span>
                      <span className="mt-1 text-[10px] text-slate-400">{option.details}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-blue-600/20 active:scale-[0.99]"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>}

        <div className="text-sm text-slate-500 mt-8">
          ¿Ya tienes una cuenta?{' '}
          <button
            onClick={() => setView(View.LOGIN)}
            className="text-blue-600 font-semibold hover:underline ml-1 cursor-pointer"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
