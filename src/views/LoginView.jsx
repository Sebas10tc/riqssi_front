import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { View } from '../types';

const PRIMARY_API_URL = import.meta.env.VITE_API_URL || 'https://riqssi-back.onrender.com';
const FALLBACK_API_URL = PRIMARY_API_URL.includes('localhost')
  ? PRIMARY_API_URL.replace('localhost', '127.0.0.1')
  : PRIMARY_API_URL.replace('127.0.0.1', 'localhost');
const API_URLS = PRIMARY_API_URL === FALLBACK_API_URL ? [PRIMARY_API_URL] : [PRIMARY_API_URL, FALLBACK_API_URL];

export default function LoginView({ onLogin, setView }) {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let lastError = null;
      let data = null;

      for (const apiUrl of API_URLS) {
        let response;
        try {
          response = await fetch(`${apiUrl}/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              correo,
              clave: password,
            }),
          });
        } catch (error) {
          lastError = error;
          continue;
        }

        data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.detail || 'No se pudo iniciar sesión');
        }
        break;
      }

      if (!data) {
        throw new Error(lastError?.message || 'No se pudo iniciar sesión');
      }
      if (data.authenticated === false || !data.access_token || !data.user) {
        throw new Error(data.detail || 'No se pudo iniciar sesión');
      }

      const loggedName = data.user?.nombre || correo.split('@')[0];
      const loggedUsername = data.user?.nombreuser || correo.split('@')[0];
      const loggedEmail = data.user?.correo || correo;

      onLogin({
        name: loggedName,
        username: loggedUsername,
        nombreuser: loggedUsername,
        email: loggedEmail,
        initials: loggedUsername.slice(0, 2).toUpperCase(),
        role: data.user?.role || 'USER',
        payment_status: data.user?.payment_status || 'approved',
        membership_expiration: data.user?.membership_expiration || null,
        membership: data.user?.membership || null,
        accessToken: data.access_token,
      }, rememberMe);
      if (data.access_token) {
        sessionStorage.setItem('riqssi.accessToken', data.access_token);
      }
    } catch (err) {
      setError(err.message || 'Error inesperado al iniciar sesión');
      setPassword('');
      setShowPassword(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 text-blue-600" style={{ color: '#2563eb' }}>Bienvenido de nuevo</h1>
        <p className="text-slate-500 text-sm mb-10">Accede a tu panel de vigilancia técnica</p>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="correo">
              Correo electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail className="h-5 w-5" />
              </span>
              <input
                className="block w-full bg-slate-50 border-slate-200 rounded-lg py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none"
                id="correo"
                name="correo"
                placeholder="usuario@riqssi.com"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
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
                className="block w-full bg-slate-50 border-slate-200 rounded-lg py-3 pl-10 pr-10 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none"
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm">
            <label className="flex items-center cursor-pointer">
              <input
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="ml-2 text-slate-700">Recordarme</span>
            </label>
            <button
              type="button"
              onClick={() => setView(View.RECOVER_PASSWORD)}
              className="text-blue-600 font-medium hover:underline text-left"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 shadow-lg shadow-blue-600/20"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            <LogIn className="h-5 w-5" />
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-slate-500 font-semibold uppercase tracking-widest">O continuar con</span>
          </div>
        </div>

        <div className="text-sm text-slate-500">
          ¿No tienes una cuenta?{' '}
          <button
            onClick={() => setView(View.REGISTER)}
            className="text-blue-600 font-semibold hover:underline ml-1 cursor-pointer"
          >
            Regístrate ahora
          </button>
        </div>
      </div>
    </div>
  );
}