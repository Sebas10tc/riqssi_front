import { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { View } from '../types';
import { recoverPassword } from '../services/authService';
 
export default function RecoverPasswordView({ setView }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await recoverPassword(email);

      setView(View.INSTRUCTIONS_SENT);
    } catch (err) {
      setError(err.message || 'Error inesperado al enviar instrucciones');
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 bg-[#f8fafc]">
      <div className="w-full max-w-lg bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-xl">
        <h1 className="text-3xl font-bold mb-3 text-slate-900" style={{ color: '#2563eb' }} >Recuperar contraseña</h1>
        <p className="text-slate-500 text-sm mb-10 leading-relaxed max-w-md mx-auto">
          Introduce tu correo electrónico para recibir las instrucciones de recuperación.
        </p>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
            {error}
          </div>
        ) : null}
 
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="email">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <span className="text-slate-400 font-semibold select-none ml-1">@</span>
              </span>
              <input
                className="block w-full bg-slate-50 border-slate-200 rounded-lg py-3 pl-9 pr-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none"
                id="email"
                placeholder="analista@riqssi.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
 
          {/* Submit Button */}
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-blue-600/20 active:scale-[0.99]"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Enviando...' : 'Enviar instrucciones'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>
 
        {/* Back Link */}
        <div className="mt-8">
          <button
            onClick={() => setView(View.LOGIN)}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </button>
        </div>
 
        {/* Internal Testing Scenario Box */}
        <div className="mt-10 p-5 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl">
          <p className="text-[10px] tracking-widest text-slate-400 font-bold uppercase mb-3">
            INTERNAL TESTING: HU0005 SCENARIO
          </p>
          <button
            onClick={() => setView(View.INSTRUCTIONS_SENT)}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-600 font-semibold py-2 px-4 rounded-lg shadow-sm transition active:scale-[0.98]"
          >
            SIMULATE CHANGE PASSWORD (ACCOUNT)
          </button>
        </div>
      </div>
    </div>
  );
}