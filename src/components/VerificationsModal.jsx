import { X } from 'lucide-react';

const SLICES = [
  { key: 'fake', label: 'Fake', color: '#dc2626' },
  { key: 'real', label: 'Verdadero', color: '#16a34a' },
];

function polarToCartesian(radius, angle) {
  return [radius * Math.cos(angle - Math.PI / 2), radius * Math.sin(angle - Math.PI / 2)];
}

function PieChart({ fake, real }) {
  const total = fake + real;
  const radius = 80;

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">Este usuario aún no tiene verificaciones.</p>;
  }

  const values = { fake, real };
  const nonEmpty = SLICES.filter((slice) => values[slice.key] > 0);
  let startAngle = 0;

  return (
    <div className="flex flex-col items-center gap-5">
      <svg viewBox="-90 -90 180 180" className="h-52 w-52" role="img" aria-label="Proporción de verificaciones Fake vs Verdadero">
        {nonEmpty.length === 1 ? (
          <circle r={radius} fill={nonEmpty[0].color} />
        ) : (
          nonEmpty.map((slice) => {
            const sweep = (values[slice.key] / total) * 2 * Math.PI;
            const [x1, y1] = polarToCartesian(radius, startAngle);
            const [x2, y2] = polarToCartesian(radius, startAngle + sweep);
            const largeArc = sweep > Math.PI ? 1 : 0;
            startAngle += sweep;
            return (
              <path
                key={slice.key}
                d={`M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={slice.color}
              />
            );
          })
        )}
      </svg>
      <ul className="flex gap-6 text-sm">
        {SLICES.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2 text-slate-700">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
            {slice.label}: <strong>{values[slice.key]}</strong> ({Math.round((values[slice.key] / total) * 100)}%)
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VerificationsModal({ userName, verifications, onClose }) {
  const fake = Number(verifications?.fake || 0);
  const real = Number(verifications?.real || 0);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Verificaciones</h3>
            <p className="mt-1 text-sm text-slate-500">{userName}</p>
          </div>
          <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600" onClick={onClose} type="button" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <PieChart fake={fake} real={real} />
      </div>
    </div>
  );
}
