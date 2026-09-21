const PRIMARY_API_URL = import.meta.env.VITE_API_URL || 'https://riqssi-back.onrender.com';
const FALLBACK_API_URL = PRIMARY_API_URL.includes('localhost')
  ? PRIMARY_API_URL.replace('localhost', '127.0.0.1')
  : PRIMARY_API_URL.replace('127.0.0.1', 'localhost');
const API_URLS = PRIMARY_API_URL === FALLBACK_API_URL ? [PRIMARY_API_URL] : [PRIMARY_API_URL, FALLBACK_API_URL];

function authHeaders(headers = {}) {
  const token = sessionStorage.getItem('riqssi.accessToken');
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

async function requestJson(path, options) {
  let lastError = null;

  for (const apiUrl of API_URLS) {
    let response;
    try {
      response = await fetch(`${apiUrl}${path}`, { ...options, headers: authHeaders(options?.headers) });
    } catch (error) {
      lastError = error;
      continue;
    }

    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const detail = data && typeof data === 'object' ? data.detail : null;
      const fallbackDetail = response.status === 404
        ? 'El video ya no está disponible en el almacenamiento. Vuelve a descargarlo desde su enlace original.'
        : `Error HTTP ${response.status}: no se pudo procesar la solicitud`;
      const error = new Error(detail || fallbackDetail);
      error.status = response.status;
      error.detail = detail;
      error.message = detail || error.message;
      throw error;
    }

    return data || {};
  }

  throw new Error('No se pudo conectar al backend. Verifica que la API esté encendida en ' + PRIMARY_API_URL + (lastError ? ` (${lastError.message || 'sin detalle'})` : ''));
}

async function requestFormData(path, formData) {
  let lastError = null;

  for (const apiUrl of API_URLS) {
    let response;
    try {
      response = await fetch(`${apiUrl}${path}`, {
        method: 'POST',
        body: formData,
        headers: authHeaders(),
      });
    } catch (error) {
      lastError = error;
      continue;
    }

    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const detail = data && typeof data === 'object' ? data.detail : null;
      const error = new Error(detail || `Error HTTP ${response.status}: no se pudo procesar la solicitud`);
      error.status = response.status;
      error.detail = detail;
      throw error;
    }

    return data || {};
  }

  throw new Error(
    'No se pudo conectar al backend. Verifica que la API esté encendida en ' +
      PRIMARY_API_URL +
      (lastError ? ` (${lastError.message || 'sin detalle'})` : '')
  );
}

export async function uploadLocalVideo(file, nombreuser) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('nombreuser', nombreuser);

  return requestFormData('/video/upload', formData);
}

export async function getUserHistory(nombreuser) {
  return requestJson(`/historial/${nombreuser}`, { method: 'GET' });
}

export async function getExistingAnalysisReport(videoHash, nombreuser) {
  if (!videoHash) {
    throw new Error('No se recibió el hash del video.');
  }

  const qs = nombreuser ? `?nombreuser=${encodeURIComponent(nombreuser)}` : '';
  return requestJson(`/analysis/report/${videoHash}${qs}`, { method: 'GET' });
}

export async function downloadLinkForAnalysis({ url, nombreuser }) {
  const downloadData = await requestJson('/links/download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      nombreuser,
    }),
  });

  const videoHash = downloadData.video?.hash_video;
  if (!videoHash) {
    throw new Error('El backend no devolvió un video válido para continuar el análisis.');
  }

  return {
    stage: 'downloaded',
    download: downloadData,
  };
}

export async function prepareTracksForAnalysis(videoHash, nombreuser) {
  const tracksData = await requestJson(`/tracks/extract/${videoHash}?nombreuser=${encodeURIComponent(nombreuser || '')}`, {
    method: 'POST',
  });

  await requestJson(`/video-analysis/validate-video/${tracksData.pista_video_hash}`, {
    method: 'POST',
  });

  return {
    stage: 'validated',
    tracks: tracksData,
  };
}

export async function runPreparedAnalysis(preparedAnalysis) {
  const onProgress = arguments.length > 1 ? arguments[1] : undefined;
  const nombreuserArg = arguments.length > 2 ? arguments[2] : undefined;

  const emitProgress = (progress, step) => {
    if (typeof onProgress === 'function') {
      onProgress({ progress, step });
    }
  };

  const videoTrackHash = preparedAnalysis.tracks?.pista_video_hash;
  const audioTrackHash = preparedAnalysis.tracks?.pista_audio_hash;
  const videoHash = preparedAnalysis.download?.video?.hash_video;

  let videoAnalysis = null;
  let audioAnalysis = null;

  emitProgress(1, 'init');

  if (videoTrackHash) {
    emitProgress(15, 'feature_extraction');
    videoAnalysis = await requestJson(`/video-analysis/analyze-video/${videoTrackHash}`, { method: 'POST' });
    emitProgress(62, 'video_done');
  }

  if (audioTrackHash) {
    emitProgress(70, 'audio_analysis');
    audioAnalysis = await requestJson(`/audio-analysis/audio-analyze/${audioTrackHash}`, { method: 'POST' });
    emitProgress(88, 'audio_done');
  }

  emitProgress(94, 'final_verdict');
  // Allow caller to pass nombreuser in preparedAnalysis.download.usuario_nombreuser or preparedAnalysis.download.video.usuario_nombreuser
  const nombreuser = nombreuserArg || preparedAnalysis?.download?.nombreuser || preparedAnalysis?.download?.video?.usuario_nombreuser || preparedAnalysis?.download?.video?.usuario_nombreuser;
  const queryParams = new URLSearchParams({ force: 'true' });
  if (nombreuser) {
    queryParams.set('nombreuser', nombreuser);
  }
  const finalVerdict = await requestJson(`/analysis/verdict/${videoHash}?${queryParams.toString()}`, {
    method: 'POST',
  });
  emitProgress(100, 'completed');

  return {
    stage: 'completed',
    download: preparedAnalysis.download,
    tracks: preparedAnalysis.tracks,
    videoAnalysis,
    audioAnalysis,
    finalVerdict,
  };
}
