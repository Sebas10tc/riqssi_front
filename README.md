# RIQSSI Frontend

Interfaz React/Vite para autenticación, carga de archivos, análisis multimedia, membresías, historial y administración de RIQSSI.

## Tecnologías

- React 19
- Vite 8
- Tailwind CSS
- Lucide React
- Motion
- html2canvas y jsPDF

## Desarrollo local

```powershell
cd C:\RIQSSI\RIQSSI_FRONT
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Por defecto el frontend intenta usar `https://riqssi-back.onrender.com`. Para trabajar con el backend local configura:

```env
VITE_API_URL=http://localhost:8000
VITE_YAPE_QR_URL=
```

Las variables `VITE_*` se incorporan al bundle durante `npm run build`. Nunca pongas secretos, claves JWT ni la service role key de Supabase en este proyecto.

## Vistas incluidas

- Inicio de sesión, registro y recuperación de contraseña.
- Panel principal y análisis de contenido.
- Informe y veredicto final.
- Historial de análisis.
- Perfil y cierre de cuenta.
- Membresías y pago.
- Recursos y preguntas frecuentes.
- Administración de usuarios y pagos.

## Desarrollo

```powershell
npm run dev
npm run lint
npm run build
npm run preview
```

La configuración de desarrollo usa Vite. Las rutas se manejan como una SPA mediante estado de React, por lo que `vercel.json` incluye un rewrite hacia `index.html`.

## Producción en Vercel

Importa `RIQSSI_FRONT/` como proyecto y configura:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- `VITE_API_URL=https://<backend-render>.onrender.com`
- `VITE_YAPE_QR_URL=https://<proyecto>.supabase.co/storage/v1/object/public/yape/qr.jpg`

Para mostrar el QR, crea en Supabase Storage un bucket público llamado `yape` y sube la imagen como `qr.jpg`. Copia su URL pública y configúrala como `VITE_YAPE_QR_URL`.

Después de desplegar el frontend, configura su URL exacta en `FRONTEND_URLS` del backend y vuelve a desplegar el backend.

## Validación

```powershell
npm run lint
npm run build
```
