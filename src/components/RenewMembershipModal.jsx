import { useState } from 'react';
import { X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://riqssi-back.onrender.com';

const PLAN_OPTIONS = [
  { id: 'basico', label: 'Básico · S/10/mes' },
  { id: 'premium', label: 'Premium · S/25/mes' },
];

export default function RenewMembershipModal({ nombreuser, defaultPlan = 'basico', onClose }) {
  const [plan, setPlan] = useState(defaultPlan);
  const [operationCode, setOperationCode] = useState('');
  const [proof, setProof] = useState(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!operationCode.trim() || !proof) {
      setMessage('El código de operación y la imagen del comprobante son obligatorios.');
      return;
    }

    setSubmitting(true);
    try {
      const selection = await fetch(`${API_URL}/membership/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreuser, plan }),
      });
      if (!selection.ok) {
        const data = await selection.json().catch(() => null);
        throw new Error(data?.detail || 'No se pudo iniciar la renovación.');
      }

      const formData = new FormData();
      formData.append('nombreuser', nombreuser);
      formData.append('operation_code', operationCode.trim());
      formData.append('proof', proof);
      const response = await fetch(`${API_URL}/membership/payment`, { method: 'POST', body: formData });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || 'No se pudo enviar el comprobante.');
      }
      setSent(true);
    } catch (err) {
      setMessage(err.message || 'No se pudo conectar con el servidor. Inténtalo nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => !submitting && onClose()} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold text-slate-900">Renovar membresía</h3>
          <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" onClick={onClose} type="button" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-sm text-slate-600">Comprobante enviado. Tu renovación quedará activa cuando el administrador la apruebe.</p>
            <button type="button" onClick={onClose} className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Aceptar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <select className="mb-3 w-full rounded-lg border border-slate-200 p-3 text-sm" value={plan} onChange={(event) => setPlan(event.target.value)}>
              {PLAN_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <img src={import.meta.env.VITE_YAPE_QR_URL || '/storage/yape/qr.png'} alt="QR de Yape" className="mx-auto my-4 h-44 w-44 object-contain" />
            <input className="mb-3 w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Código de operación" value={operationCode} onChange={(event) => setOperationCode(event.target.value)} />
            <input className="mb-4 w-full rounded-lg border border-slate-200 p-3 text-sm" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => setProof(event.target.files?.[0] || null)} />
            {message ? <p className="mb-4 text-sm font-semibold text-red-600">{message}</p> : null}
            <div className="flex gap-3">
              <button type="button" className="w-full rounded-lg border border-slate-200 py-3 text-sm" onClick={onClose} disabled={submitting}>Cancelar</button>
              <button type="submit" disabled={submitting} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {submitting ? 'Enviando...' : 'Enviar comprobante'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
