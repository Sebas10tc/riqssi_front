# RIQSSI Frontend

Frontend React/Vite para la aplicación RIQSSI.

## Desarrollo local

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Configura `VITE_API_URL` con la URL del backend. Las variables `VITE_*` se incorporan al bundle durante `npm run build`; no pongas secretos allí.

## Producción en Vercel

Importa este directorio como proyecto y configura:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Variable de producción: `VITE_API_URL=https://<backend-render>.onrender.com`
- Variable de producción: `VITE_YAPE_QR_URL=https://<proyecto>.supabase.co/storage/v1/object/public/yape/qr.png`

Para publicar el QR, crea en Supabase Storage un bucket público llamado `yape` y sube la imagen como `qr.png` en la raíz del bucket. Copia su URL pública y úsala como `VITE_YAPE_QR_URL` en Vercel. No guardes el QR dentro del proyecto ni uses rutas `/storage/...`; las variables `VITE_*` se aplican al volver a desplegar el frontend.

Después de desplegar, usa la URL pública de Vercel como `FRONTEND_URLS` en Render y vuelve a desplegar el backend.

## Validación

```powershell
npm run lint
npm run build
```
