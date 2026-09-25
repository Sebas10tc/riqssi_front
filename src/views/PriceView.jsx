import { useState } from "react";

const PLANS = [
  {
    id: "gratis",
    tier: "Inicial",
    name: "Gratis",
    price: "S/0",
    period: "/mes",
    highlighted: false,
    features: ["2 videos al día", "Duración máxima: 1 minuto"],
    cta: "Seleccionar Gratis",
  },
  {
    id: "basico",
    tier: "Avanzado",
    name: "Básico",
    price: "S/10",
    period: "/mes",
    highlighted: true,
    badge: "Más Popular",
    features: [
      "5 videos al día",
      "Duración máxima: 3 minutos",
    ],
    cta: "Iniciar Plan Básico",
  },
  {
    id: "premium",
    tier: "Institucional",
    name: "Premium",
    price: "S/25",
    period: "/mes",
    highlighted: false,
    features: ["Videos ilimitados", "Duración máxima: 8 minutos"],
    cta: "Seleccionar Premium",
  },
];

function CheckIcon({ filled }) {
  return (
    <svg
      className="text-blue-600 shrink-0"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? "0" : "2"}
    >
      {filled ? (
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.5 14.5l-4-4 1.41-1.41L10.5 13.67l5.59-5.59L17.5 9.5l-7 7z" />
      ) : (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

function PlanCard({ plan, onSelect, isProcessing }) {
  const highlighted = plan.highlighted;

  return (
    <div
      className={`bg-white rounded-2xl p-10 flex flex-col relative ${
        highlighted
          ? "border-2 border-blue-600 scale-105 z-10"
          : "border border-slate-100"
      }`}
      style={{
        boxShadow:
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      }}
    >
      {highlighted && plan.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          {plan.badge}
        </div>
      )}

      <div className="mb-8">
        <span
          className={
            highlighted
              ? "text-[10px] font-bold tracking-widest uppercase text-blue-600"
              : "text-[10px] font-bold tracking-widest uppercase bg-slate-100 text-slate-600 px-3 py-1 rounded-full"
          }
        >
          {plan.tier}
        </span>
        <h2 className="text-2xl font-bold text-slate-900 mt-4">{plan.name}</h2>
        <div className="mt-2 flex items-baseline gap-1">
          <span
            className={`text-4xl font-bold ${
              highlighted ? "text-blue-600" : "text-slate-900"
            }`}
          >
            {plan.price}
          </span>
          <span className="text-sm text-slate-500">{plan.period}</span>
        </div>
      </div>

      <div className="space-y-4 grow">
        {plan.features.map((feature) => (
          <div className="flex items-start gap-3" key={feature}>
            <CheckIcon filled={highlighted} />
            <p
              className={`text-sm ${
                highlighted ? "text-slate-900 font-medium" : "text-slate-600"
              }`}
            >
              {feature}
            </p>
          </div>
        ))}
      </div>

        <button
        className={`mt-10 w-full py-3 font-semibold rounded-lg transition-all duration-200 ${
          highlighted
            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            : "bg-slate-100 border border-slate-200 text-blue-600 hover:bg-slate-200"
        } ${isProcessing ? "opacity-70 cursor-not-allowed" : ""}`}
        onClick={() => {
          onSelect(plan.id);
        }}
        disabled={isProcessing}
      >
        {isProcessing ? "Procesando..." : plan.cta}
      </button>
    </div>
  );
}

export default function RiqssiPricing({ user }) {
  const API_URL = import.meta.env.VITE_API_URL || 'https://riqssi-back.onrender.com';
  const [processingId, setProcessingId] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [operationCode, setOperationCode] = useState('');
  const [proof, setProof] = useState(null);
  const [message, setMessage] = useState('');

  const handleSelect = (planId) => {
    if (!user?.nombreuser) {
      setMessage('Inicia sesión para seleccionar una membresía.');
      return;
    }
    if (planId === 'gratis') return;
    setSelectedPlan(planId);
    setMessage('');
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!proof || !operationCode.trim()) {
      setMessage('Adjunta el comprobante y el código de operación.');
      return;
    }
    setProcessingId(selectedPlan);
    const selection = await fetch(`${API_URL}/membership/select`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombreuser: user.nombreuser, plan: selectedPlan }),
    });
    if (!selection.ok) {
      const selectionData = await selection.json().catch(() => null);
      setMessage(selectionData?.detail || 'No se pudo seleccionar el plan.');
      setProcessingId(null);
      return;
    }
    const formData = new FormData();
    formData.append('nombreuser', user.nombreuser);
    formData.append('operation_code', operationCode);
    formData.append('proof', proof);
    const response = await fetch(`${API_URL}/membership/payment`, { method: 'POST', body: formData });
    const data = await response.json();
    setMessage(response.ok ? 'Comprobante enviado. Está pendiente de aprobación.' : (data.detail || 'No se pudo enviar el comprobante.'));
    setProcessingId(null);
    if (response.ok) setSelectedPlan(null);
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-900 font-sans bg-slate-50">
      {/* Main */}
      <main className="grow max-w-7xl mx-auto px-8 py-16 w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Seleccione su Plan de Análisis
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Escale sus capacidades de investigación con nuestras soluciones
            forenses de alta precisión diseñadas para infraestructuras
            críticas.
          </p>
        </div>
        {message ? <p className="mb-6 text-center text-sm font-semibold text-slate-600">{message}</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 items-stretch">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSelect={handleSelect}
              isProcessing={processingId === plan.id}
            />
          ))}
        </div>
      </main>

      {selectedPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={submitPayment} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">Pagar plan {selectedPlan}</h2>
            <p className="mt-2 text-sm text-slate-500">Escanea el QR de Yape y adjunta tu comprobante.</p>
            <img src={import.meta.env.VITE_YAPE_QR_URL || '/storage/yape/qr.png'} alt="QR de Yape" className="mx-auto my-5 h-52 w-52 object-contain" />
            <input className="mb-3 w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Código de operación" value={operationCode} onChange={(event) => setOperationCode(event.target.value)} />
            <input className="mb-5 w-full rounded-lg border border-slate-200 p-3 text-sm" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => setProof(event.target.files?.[0] || null)} />
            <div className="flex gap-3"><button type="button" className="w-full rounded-lg border border-slate-200 py-3" onClick={() => setSelectedPlan(null)}>Cancelar</button><button type="submit" className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white">Enviar comprobante</button></div>
          </form>
        </div>
      ) : null}

    </div>
  );
}
