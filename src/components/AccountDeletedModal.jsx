export default function AccountDeletedModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
        <p className="text-lg font-bold text-slate-900">Tu cuenta fue eliminada</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
