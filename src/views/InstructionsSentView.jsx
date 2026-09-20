import { Mail, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { View } from '../types';
 
export default function InstructionsSentView({ setView }) {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 bg-[#f8fafc]">
      <div className="w-full max-w-lg bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-xl flex flex-col items-center">
        {/* Mail Icon Container */}
        <div className="bg-blue-50/80 p-5 rounded-2xl mb-8 border border-blue-100 flex items-center justify-center">
          <Mail className="h-10 w-10 text-blue-600" />
        </div>
 
        <h1 className="text-3xl font-bold mb-3 text-slate-900 leading-tight" style={{ color: '#2563eb' }}>
          Nueva contraseña enviada
        </h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed max-w-sm">
          Hemos enviado una contraseña temporal a tu correo electrónico. Inicia sesión con ella y luego cámbiala desde tu perfil.
        </p>
 
        {/* Technical Note */}
        <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-5 mb-8 text-left text-xs text-slate-600 leading-relaxed relative flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <span className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[10px]">
              NOTA TÉCNICA
            </span>
            La contraseña temporal se reemplaza cuando actualices tu contraseña desde el perfil. Si no recibes el correo, verifica tu carpeta de spam.
          </div>
        </div>
 
        {/* Action Button */}
        <button
          onClick={() => setView(View.LOGIN)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-lg flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-blue-600/20 active:scale-[0.99] mb-8"
        >
          Volver al inicio de sesión
          <ArrowRight className="h-5 w-5" />
        </button>
 
        {/* Secure Badge Footer */}
        <div className="pt-6 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          SISTEMA RIQSSI PROTEGIDO
        </div>
      </div>
    </div>
  );
}
 