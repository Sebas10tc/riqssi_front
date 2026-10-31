import { useState } from 'react';

const YAPE_QR_URL = import.meta.env.VITE_YAPE_QR_URL?.trim() || '';

function isPublicHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export default function YapeQrImage({ className = '' }) {
  const [imageError, setImageError] = useState(false);

  if (!isPublicHttpsUrl(YAPE_QR_URL) || imageError) {
    return (
      <p className="my-4 text-center text-sm text-slate-500">
        {imageError
          ? 'No se pudo cargar el QR de Yape. Verifica la URL pública de Supabase Storage.'
          : 'El QR de Yape aún no está configurado. Configura VITE_YAPE_QR_URL con la URL pública de Supabase Storage.'}
      </p>
    );
  }

  return (
    <img
      src={YAPE_QR_URL}
      alt="QR de Yape"
      className={className}
      onError={() => setImageError(true)}
    />
  );
}
