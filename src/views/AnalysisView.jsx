import { useEffect, useState } from 'react';
import { FileText, Clock, Music, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { View } from '../types';
import { prepareTracksForAnalysis, runPreparedAnalysis } from '../services/linkService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function formatAnalysisErrorMessage(error) {
  const message = error?.message || 'No se pudo completar el análisis.';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('no se pudo conectar al backend') || lowerMessage.includes('failed to fetch')) {
    return `${message}\n\nAcceder a ${API_URL}/docs o http://127.0.0.1:8000/docs para probar los endpoints.`;
  }

  return message;
}

function getThumbnailUrl(thumbnailPath) {
  if (!thumbnailPath) {
    return null;
  }

  if (/^\/storage\//i.test(thumbnailPath)) {
    return `${API_URL}${thumbnailPath}`;
  }

  const looksLikeImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(thumbnailPath);
  if (!looksLikeImage) {
    return null;
  }

  if (/^https?:\/\//i.test(thumbnailPath)) {
    return thumbnailPath;
  }

  const normalizedPath = thumbnailPath.replace(/\\/g, '/');

  const storageIndex = normalizedPath.toLowerCase().indexOf('/storage/');
  if (storageIndex >= 0) {
    return `${API_URL}${normalizedPath.slice(storageIndex)}`;
  }

  if (normalizedPath.toLowerCase().startsWith('storage/')) {
    return `${API_URL}/${normalizedPath}`;
  }

  return `${API_URL}/${normalizedPath.replace(/^\/?/, '')}`;
}

export default function AnalysisView({
  setView,
  user,
  analysisRequest,
  setAnalysisRequest,
  analysisThumbnailUrl,
  analysisResult,
  setAnalysisResult,
  analysisStatus,
  setAnalysisStatus,
  analysisError,
  setAnalysisError,
}) {
  const [pipelineProgress, setPipelineProgress] = useState(1);
  const [pipelineStep, setPipelineStep] = useState('init');
  const [readyRequest, setReadyRequest] = useState(analysisRequest?.tracks ? analysisRequest : null);

  useEffect(() => {
    let cancelled = false;

    const loadTracks = async () => {
      if (!analysisRequest?.download) {
        return;
      }

      if (analysisRequest?.tracks) {
        setReadyRequest(analysisRequest);
        return;
      }

      try {
        const videoHash = analysisRequest.download.video?.hash_video;
        if (!videoHash) {
          return;
        }

        const tracks = await prepareTracksForAnalysis(videoHash, user?.nombreuser);
        if (cancelled) {
          return;
        }

        const mergedRequest = {
          ...analysisRequest,
          ...tracks,
          download: analysisRequest.download,
          tracks: tracks.tracks,
        };

        setAnalysisRequest?.(mergedRequest);
        setReadyRequest(mergedRequest);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAnalysisError(formatAnalysisErrorMessage(error) || 'No se pudieron preparar las pistas.');
        setAnalysisStatus('error');
      }
    };

    loadTracks();

    return () => {
      cancelled = true;
    };
  }, [analysisRequest, setAnalysisRequest, setAnalysisError, setAnalysisStatus, user?.nombreuser]);

  useEffect(() => {
    let cancelled = false;

    const runAnalysis = async () => {
      if (!readyRequest?.download || !readyRequest?.tracks) {
        return;
      }

      setAnalysisStatus('processing');
      setAnalysisError('');
      setPipelineProgress(1);
      setPipelineStep('init');

      try {
        const result = await runPreparedAnalysis(readyRequest, ({ progress, step }) => {
          if (cancelled) {
            return;
          }
          setPipelineProgress(progress);
          setPipelineStep(step);
        }, user?.nombreuser);

        if (cancelled) {
          return;
        }

        setAnalysisResult(result);
        setAnalysisStatus('completed');
        setPipelineProgress(100);
        setPipelineStep('completed');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAnalysisError(formatAnalysisErrorMessage(error) || 'No se pudo completar el análisis.');
        setAnalysisStatus('error');
      }
    };

    runAnalysis();

    return () => {
      cancelled = true;
    };
  }, [readyRequest, setAnalysisResult, setAnalysisError, setAnalysisStatus, user]);

  useEffect(() => {
    if (readyRequest?.tracks && analysisStatus !== 'completed' && analysisStatus !== 'error') {
      setAnalysisStatus('processing');
    }
  }, [readyRequest, analysisStatus, setAnalysisStatus]);

  useEffect(() => {
    if (analysisStatus === 'completed') {
      const timer = setTimeout(() => {
        setView(View.REPORT);
      }, 1200);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [analysisStatus, setView]);

  const isCompleted = analysisStatus === 'completed';

  const clampProgress = (value) => Math.max(0, Math.min(100, Math.round(value)));
  const featureProgress = clampProgress((pipelineProgress / 35) * 100);
  const biometricsProgress = clampProgress(((pipelineProgress - 20) / 40) * 100);
  const audioProgress = clampProgress(((pipelineProgress - 60) / 30) * 100);

  const stageLabelByStep = {
    init: 'INICIANDO ANÁLISIS',
    feature_extraction: 'EXTRACCIÓN DE CARACTERÍSTICAS',
    video_done: 'ANÁLISIS BIOMÉTRICO',
    audio_analysis: 'VERIFICACIÓN DE AUDIO',
    audio_done: 'CONSOLIDANDO RESULTADOS',
    final_verdict: 'GENERANDO VEREDICTO FINAL',
    completed: 'ANÁLISIS COMPLETO',
  };

  const stageLabel = stageLabelByStep[pipelineStep] || 'PROCESANDO';
  const circleDashOffset = 364 - (364 * clampProgress(pipelineProgress)) / 100;
  const sharedThumbnailUrl = analysisThumbnailUrl || analysisRequest?.download?.video?.thumbnail_url;
  const videoMeta = analysisResult?.download?.video || analysisRequest?.download?.video || {};
  const thumbnailSource =
    analysisThumbnailUrl ||
    analysisResult?.download?.video?.thumbnail_url ||
    sharedThumbnailUrl ||
    analysisRequest?.download?.video?.thumbnail_url ||
    analysisResult?.download?.video?.thumbnail_path ||
    analysisRequest?.download?.video?.thumbnail_path;
  const thumbnailUrl = getThumbnailUrl(thumbnailSource);

  useEffect(() => {
    if (!thumbnailUrl) {
      return;
    }

    const preloadedImage = new Image();
    preloadedImage.fetchPriority = 'high';
    preloadedImage.src = thumbnailUrl;
  }, [thumbnailUrl]);

  return (
    <div className="w-full px-6 py-6 flex flex-col lg:flex-row items-center justify-center gap-12 h-full">
      <section className="lg:col-span-3 w-full max-w-2xl" data-purpose="video-analysis-display">
        <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-2xl bg-slate-100 aspect-video flex flex-col">
          <div className="relative grow flex items-center justify-center overflow-hidden">
            <img 
              alt="Video Analysis Frame" 
              className="w-full h-full object-cover opacity-60 grayscale" 
              loading="eager"
              fetchPriority="high"
              decoding="async"
              src={thumbnailUrl || 'https://ojo-publico.com/sites/default/files/2026-03/Dise%C3%B1o%20sin%20t%C3%ADtulo%20-%202026-03-17T134533-compressed.jpg'}
            />
            <motion.div 
              className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20"
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
              <div className="relative flex items-center justify-center">
                <svg className="w-32 h-32 -rotate-90">
                  <circle className="text-slate-200" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="4" />
                  <motion.circle 
                    className="text-blue-600" 
                    cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="4"
                    strokeDasharray="364"
                    animate={{ strokeDashoffset: circleDashOffset }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute text-4xl font-bold text-slate-900">
                  {`${clampProgress(pipelineProgress)}%`}
                </div>
              </div>
              <div className="mt-8 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full px-6 py-2 text-[10px] tracking-widest font-bold uppercase text-blue-700 shadow-sm">
                • {readyRequest?.tracks ? (isCompleted ? 'ANÁLISIS COMPLETO' : stageLabel) : 'CARGANDO MINIATURA Y PISTAS'}
              </div>
              {analysisResult?.finalVerdict ? (
                <div className="mt-4 rounded-full bg-slate-900/90 px-5 py-2 text-xs font-semibold text-white">
                  Veredicto: {analysisResult.finalVerdict.etiqueta} - {analysisResult.finalVerdict.veredicto_final}
                </div>
              ) : null}
              {analysisError ? (
                <div className="mt-4 rounded-full bg-red-600/90 px-5 py-2 text-xs font-semibold text-white">
                  {analysisError}
                </div>
              ) : null}
            </div>
          </div>
          
          <div className="bg-white p-6 grid grid-cols-3 gap-4 border-t border-slate-200">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Resolución</p>
              <p className="text-sm font-medium text-slate-700">{videoMeta.resolucion || 'Sin dato'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Formato</p>
              <p className="text-sm font-medium text-slate-700">{videoMeta.red_social || 'Sin dato'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Frame Rate</p>
              <p className="text-sm font-medium text-slate-700">{videoMeta.duracion ? `${videoMeta.duracion} s` : 'Sin dato'}</p>
            </div>
          </div>
        </div>
      </section>

      <aside className="lg:w-1/3 space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tight text-slate-900" style={{ color: '#2563eb' }}>Analizando<br />Video...</h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Desglosando capas de video y audio para detectar patrones de IA y anomalías sintéticas.
          </p>
        </div>

        <div className="space-y-4">
          <StatusCard
            icon={<FileText className="h-5 w-5" />}
            title="Extracción de Características"
            progress={isCompleted ? 100 : featureProgress}
            status={isCompleted ? 'COMPLETO' : featureProgress > 0 ? `${featureProgress}%` : 'PENDIENTE'}
            inactive={featureProgress === 0 && !isCompleted}
          />
          <StatusCard
            icon={<Clock className="h-5 w-5" />}
            title="Análisis Biométrico Facial"
            progress={isCompleted ? 100 : biometricsProgress}
            status={isCompleted ? 'COMPLETO' : biometricsProgress > 0 ? `${biometricsProgress}%` : 'PENDIENTE'}
            inactive={biometricsProgress === 0 && !isCompleted}
          />
          <StatusCard
            icon={<Music className="h-5 w-5" />}
            title="Verificación de Espectro de Audio"
            progress={isCompleted ? 100 : audioProgress}
            status={isCompleted ? 'COMPLETO' : audioProgress > 0 ? `${audioProgress}%` : 'PENDIENTE'}
            inactive={audioProgress === 0 && !isCompleted}
          />
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex gap-4">
          <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-slate-800">Privacidad de Datos Garantizada</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
              Su contenido se procesa en un entorno aislado y no se comparte con otros usuarios después del análisis técnico.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function StatusCard({ icon, title, progress, status, inactive = false }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm transition-opacity duration-300 ${inactive ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`mt-1 p-2 rounded-lg border ${inactive ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-100'}`}>
          <div className={inactive ? 'text-slate-400' : 'text-blue-600'}>{icon}</div>
        </div>
        <div className="grow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-blue-600">{title}</h3>
            <span className={`text-[10px] font-bold tracking-tighter ${inactive ? 'text-slate-400' : 'text-blue-600'}`}>{status}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full ${inactive ? 'bg-slate-300' : 'bg-blue-600'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}