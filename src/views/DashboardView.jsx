import { UploadCloud, Link as LinkIcon, History, PlayCircle, MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { View } from '../types';
import { downloadLinkForAnalysis, getUserHistory, uploadLocalVideo } from '../services/linkService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAssetUrl(assetPath) {
  if (!assetPath) {
    return '';
  }

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const normalizedPath = assetPath.replace(/\\/g, '/');

  if (/^\/storage\//i.test(normalizedPath)) {
    return `${API_URL}${normalizedPath}`;
  }

  if (normalizedPath.toLowerCase().startsWith('storage/')) {
    return `${API_URL}/${normalizedPath}`;
  }

  return `${API_URL}/${normalizedPath.replace(/^\/?/, '')}`;
}

function getFriendlyErrorMessage(err) {
  const message = err?.message || '';
  const lowerMessage = message.toLowerCase();

  if (err?.status === 403 || lowerMessage.includes('autenticación requerida') || lowerMessage.includes('sign in to confirm') || lowerMessage.includes('cookies')) {
    return 'YouTube requiere cookies de sesión para este video. Exporta tu archivo cookies.txt, configúralo en el backend con YTDLP_COOKIEFILE y vuelve a intentar.';
  }

  return message || 'No se pudo validar el video.';
}

function getVerdictDisplayLabel(verdict) {
  const normalized = String(verdict || '').trim().toUpperCase();

  if (normalized === 'MANIPULADO' || normalized === 'FAKE') {
    return 'FAKE';
  }

  if (normalized === 'ORIGINAL' || normalized === 'VERDADERO' || normalized === 'BAJO RIESGO') {
    return 'VERDADERO';
  }

  return verdict || 'ESCANEADO';
}

export default function DashboardView({ setView, user, onStartAnalysis, onOpenReport }) {
  const fileInputRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState(null);

  const handleLatestAnalysisClick = () => {
    if (typeof onOpenReport === 'function') {
      onOpenReport(latestAnalysis);
      return;
    }

    setView(View.REPORT);
  };

  const openExistingAnalysisIfAvailable = async (videoHash) => {
    if (!user?.nombreuser || !videoHash) {
      return false;
    }

    try {
      const data = await getUserHistory(user.nombreuser);
      const history = Array.isArray(data.history) ? data.history : [];
      const existingReport = history.find((item) => item.video?.hash_video === videoHash && item.resultado_total);

      if (existingReport && typeof onOpenReport === 'function') {
        onOpenReport(existingReport);
        return true;
      }
    } catch {
      // Si falla la consulta, seguimos con el análisis normal.
    }

    return false;
  };

  useEffect(() => {
    let cancelled = false;

    const loadLatestAnalysis = async () => {
      if (!user?.nombreuser) {
        setLatestAnalysis(null);
        return;
      }

      try {
        const data = await getUserHistory(user.nombreuser);
        const history = Array.isArray(data.history) ? [...data.history] : [];

        history.sort((a, b) => {
          if (a.fecha_consulta && b.fecha_consulta) {
            return new Date(b.fecha_consulta) - new Date(a.fecha_consulta);
          }

          if (a.fecha_consulta) return -1;
          if (b.fecha_consulta) return 1;
          return 0;
        });

        if (!cancelled) {
          setLatestAnalysis(history[0] || null);
        }
      } catch {
        if (!cancelled) {
          setLatestAnalysis(null);
        }
      }
    };

    loadLatestAnalysis();

    return () => {
      cancelled = true;
    };
  }, [user?.nombreuser]);

  const preloadImage = (imageUrl) => new Promise((resolve) => {
    if (!imageUrl) {
      resolve();
      return;
    }

    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = getAssetUrl(imageUrl);
  });

  const handleLocalVideoClick = () => {
    if (loading) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleLocalVideoChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.mp4')) {
      setError('Solo se admiten archivos .mp4.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const uploaded = await uploadLocalVideo(selectedFile, user?.username || user?.name || user?.email || 'demo@gmail.com');
      const video = uploaded?.video;

      if (!video?.hash_video) {
        throw new Error('No se recibió el identificador del video cargado.');
      }

      preloadImage(video.thumbnail_path);

      const alreadyAnalyzed = await openExistingAnalysisIfAvailable(video.hash_video);
      if (alreadyAnalyzed) {
        return;
      }

      onStartAnalysis?.({
        stage: 'uploaded',
        source: 'local-file',
        download: {
          video,
        },
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err) || 'No se pudo cargar el video local.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartScan = async () => {
    if (!videoUrl.trim()) {
      setError('Introduce una URL válida.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const prepared = await downloadLinkForAnalysis({
        url: videoUrl.trim(),
        nombreuser: user?.username || user?.name || user?.email || 'demo@gmail.com',
      });

      preloadImage(prepared?.download?.video?.thumbnail_url);

      const videoHash = prepared?.download?.video?.hash_video;
      const alreadyAnalyzed = await openExistingAnalysisIfAvailable(videoHash);
      if (alreadyAnalyzed) {
        return;
      }

      onStartAnalysis?.(prepared);
    } catch (err) {
      setError(getFriendlyErrorMessage(err) || 'No se pudo validar el video.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-8 py-6 lg:h-full lg:flex lg:flex-col">
      <section className="mb-6 lg:shrink-0">
        <h1 className="text-3xl font-extrabold mb-2 text-slate-900" style={{ color: '#2563eb' }}>Hola, {user?.name || 'Seba'} :D</h1>
        <p className="text-slate-500">Descubre si el video que estás viendo es verdadero o ha sido manipulado por la IA.</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 lg:flex-1 lg:min-h-0">
        <div 
          onClick={handleLocalVideoClick}
          className="lg:col-span-2 bg-slate-50/50 rounded-xl p-8 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center min-h-48 lg:min-h-0 relative overflow-hidden group hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <input
            ref={fileInputRef}
            accept="video/mp4,.mp4"
            className="hidden"
            onChange={handleLocalVideoChange}
            type="file"
          />
          <div className="bg-blue-50 p-4 rounded-full mb-4">
            <UploadCloud className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-lg font-semibold text-slate-900">Cargar Archivo de Video</p>
          <p className="text-sm text-slate-500 mt-1">Haz clic para elegir un video de tu carpeta y empezar el análisis</p>
          <div className="mt-6 px-3 py-1 bg-slate-200 rounded text-[10px] font-mono text-slate-700 border border-slate-300 uppercase">
            MP4
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col">
          <div className="mb-6">
            <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="font-bold text-lg mb-1 text-slate-900" style={{ color: '#2563eb' }} >Enlace Externo</h2>
            <p className="text-xs text-slate-500">Analizar video directamente desde una URL pública.</p>
          </div>
          <div className="mt-auto space-y-3">
            <input 
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 text-slate-900" 
              placeholder="Introduce la URL del video" 
              type="text" 
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            {error ? <p className="text-sm text-red-600 whitespace-pre-line">{error}</p> : null}
            <button 
              onClick={handleStartScan}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-md shadow-lg shadow-blue-500/20 transition duration-200"
            >
              {loading ? 'Validando...' : 'Iniciar Escaneo'}
            </button>
          </div>
        </div>
      </div>

      {latestAnalysis ? (
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm lg:shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900">Último Análisis</h3>
            </div>
            <button 
              onClick={() => setView(View.HISTORY)}
              className="text-[10px] text-slate-400 hover:text-blue-600 uppercase tracking-wider font-bold transition outline-none"
            >
              Ver historial completo
            </button>
          </div>
          <div className="relative group cursor-pointer" onClick={handleLatestAnalysisClick}>
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="relative w-40 h-24 rounded-lg overflow-hidden shrink-0 bg-slate-900">
                {latestAnalysis.video?.thumbnail_path ? (
                  <img
                    alt={latestAnalysis.video?.nombrevideo || 'Miniatura del último video'}
                    src={getAssetUrl(latestAnalysis.video.thumbnail_path)}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-brr from-blue-600/20 to-black flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                      <PlayCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-1 left-1 right-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-4/5"></div>
                </div>
              </div>
              
              <div className="grow">
                <div className="flex items-center space-x-3 mb-1">
                  <h4 className="font-bold text-slate-900 truncate">{latestAnalysis.video?.nombrevideo || latestAnalysis.video?.hash_video || 'Video escaneado'}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${latestAnalysis.resultado_total?.etiqueta_final === 'MANIPULADO' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    {getVerdictDisplayLabel(latestAnalysis.resultado_total?.etiqueta_final || latestAnalysis.estado || 'Escaneado')}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-slate-500 mb-4">
                  <span className="flex items-center gap-1">
                    <History className="w-3 h-3" />
                    {latestAnalysis.fecha_consulta ? new Date(latestAnalysis.fecha_consulta).toLocaleString() : 'Sin fecha'}
                  </span>
                  <span className="font-medium">{latestAnalysis.video?.usuario_nombreuser ? `• ${latestAnalysis.video.usuario_nombreuser}` : ''}</span>
                </div>
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 w-4/5"></div>
                </div>
              </div>

              <div className="md:text-right md:px-6 md:border-l border-slate-100 flex items-center space-x-4">
                <div>
                  <div className="text-3xl font-extrabold text-slate-900">
                    {latestAnalysis.resultado_total?.veredicto_final != null
                      ? `${Math.round(Number(latestAnalysis.resultado_total.veredicto_final) * 100)}%`
                      : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Veredicto final</div>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}