import React, { useState } from "react";

const FAQ_ITEMS = [
  {
    id: "gen-001",
    category: "General",
    question: "¿Qué es RIQSSI?",
    answer:
      "RIQSSI es una plataforma avanzada de análisis forense digital especializada en la detección de manipulaciones multimedia mediante Inteligencia Artificial de última generación. Nuestra herramienta permite identificar deepfakes, ediciones no autorizadas y alteraciones en metadatos con una precisión del 99.8% en entornos controlados.",
    ref: "REF: GEN-001",
    openByDefault: true,
  },
  {
    id: "sec-001",
    category: "Seguridad",
    question: "¿Es mi información privada?",
    answer:
      "Nos comprometemos con la máxima confidencialidad. Todos los datos y archivos analizados son eliminados permanentemente de nuestros servidores inmediatamente después de completar el análisis. Cumplimos estrictamente con la normativa GDPR y estándares ISO de seguridad de la información.",
  },
  {
    id: "ana-001",
    category: "Análisis",
    question: "¿Qué formatos de video soportan?",
    answer:
      "Soportamos MP4, MKV, AVI, MOV y formatos crudos (RAW). El análisis se realiza frame a frame mediante una inspección de ruido a nivel de píxel para asegurar que no se pierda detalle durante el proceso forense.",
  },
  {
    id: "sus-001",
    category: "Suscripciones",
    question: "¿Cómo funcionan los límites de los planes?",
    plans: [
      { name: "Plan Gratuito", value: "2 videos/día · 1 min", width: "20%", color: "bg-slate-300" },
      { name: "Plan Básico", value: "5 videos/día · 3 min", width: "60%", color: "bg-blue-400" },
      { name: "Plan Premium", value: "Ilimitado", width: "100%", color: "bg-blue-600" },
    ],
  },
];

function FaqCard({ item, isOpen, onToggle }) {
  return (
    <div className="bg-white border border-black/8 rounded-xl overflow-hidden shadow-sm transition-all hover:border-blue-600">
      <button
        className="w-full flex justify-between items-center p-5 text-left bg-white hover:bg-slate-50 transition-colors"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-4">
          <span
            className={`w-1 h-5 rounded transition-colors ${
              isOpen ? "bg-blue-600" : "bg-slate-200"
            }`}
          />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            {item.question}
          </h3>
        </div>
        <span
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="px-5 pb-6 pt-2">
          <div className="h-px bg-slate-100 mb-4" />

          {item.answer && (
            <p className="text-sm text-slate-600 leading-relaxed">{item.answer}</p>
          )}

          {item.ref && (
            <div className="mt-4 flex gap-2">
              <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] rounded font-mono uppercase tracking-tighter">
                {item.ref}
              </span>
            </div>
          )}

          {item.plans && (
            <div className="space-y-4 max-w-sm">
              {item.plans.map((plan) => (
                <React.Fragment key={plan.name}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold uppercase">
                      {plan.name}
                    </span>
                    <span className="text-blue-600 font-bold">{plan.value}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full">
                    <div
                      className={`${plan.color} h-full rounded-full`}
                      style={{ width: plan.width }}
                    />
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RiqssiFAQ() {
  const [openId, setOpenId] = useState(
    FAQ_ITEMS.find((i) => i.openByDefault)?.id ?? null
  );

  const toggle = (id) => {
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">


      {/* Main */}
      <main className="grow container mx-auto px-4 py-8 max-w-5xl w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ color: '#2563eb' }}>
              Preguntas Frecuentes
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Centro de ayuda técnico y soporte de RIQSSI
            </p>
          </div>
          <div className="flex gap-2">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[10px] rounded border border-blue-100 uppercase tracking-widest font-bold">
              Base de Conocimiento
            </span>
          </div>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto" id="faq-container">
          {FAQ_ITEMS.map((item) => (
            <FaqCard
              key={item.id}
              item={item}
              isOpen={openId === item.id}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </div>
      </main>

 
    </div>
  );
}
