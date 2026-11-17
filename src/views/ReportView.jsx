import { Download, Search, Maximize2, FileText, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { getExistingAnalysisReport } from '../services/linkService';
const API_URL = import.meta.env.VITE_API_URL || 'https://riqssi-back.onrender.com';

function getThumbnailUrl(thumbnailPath) {
  if (!thumbnailPath) {
    return null;
  }

  if (/^\/storage\//i.test(thumbnailPath)) {
    return `${API_URL}${thumbnailPath}`;
  }

  if (/^https?:\/\//i.test(thumbnailPath)) {
    return thumbnailPath;
  }

  const normalizedPath = thumbnailPath.replace(/\\/g, '/');
  if (normalizedPath.toLowerCase().startsWith('storage/')) {
    return `${API_URL}/${normalizedPath}`;
  }

  const storageIndex = normalizedPath.toLowerCase().indexOf('/storage/');
  if (storageIndex >= 0) {
    return `${API_URL}${normalizedPath.slice(storageIndex)}`;
  }

  return `${API_URL}/${normalizedPath.replace(/^\/?/, '')}`;
}

function openExternalLink(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function getVerdictDisplayLabel(verdict) {
  const normalized = String(verdict || '').trim().toUpperCase();

  if (normalized === 'MANIPULADO' || normalized === 'FAKE') {
    return 'FAKE';
  }

  if (normalized === 'ORIGINAL' || normalized === 'VERDADERO' || normalized === 'BAJO RIESGO') {
    return 'VERDADERO';
  }

  return verdict || 'SIN DATOS';
}

function SectionHeader({ icon, title, description }) {
  return (
    <div className="mb-3">
      <h3 className="flex items-center gap-2 text-sm font-bold text-blue-600">
        {icon}
        {title}
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export default function ReportView({ analysisResult, user }) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [accessError, setAccessError] = useState('');
  const finalVerdict = analysisResult?.finalVerdict;
  const videoResult = analysisResult?.videoAnalysis;
  const audioResult = analysisResult?.audioAnalysis;
  const hasAudioAnalysis = Boolean(audioResult?.verdict || finalVerdict?.audio?.etiqueta);
  const audioOmitted = Boolean(analysisResult?.tracks && !analysisResult.tracks.pista_audio_hash) || Boolean(finalVerdict && !hasAudioAnalysis);
  const videoMeta = analysisResult?.download?.video;
  const thumbnailUrl = getThumbnailUrl(videoMeta?.thumbnail_url || videoMeta?.thumbnail_path);
  const verdictRaw = finalVerdict?.etiqueta || audioResult?.verdict || videoResult?.verdict || 'SIN DATOS';
  const verdictText = getVerdictDisplayLabel(verdictRaw);
  const finalVideoFakeProbability = Number(finalVerdict?.video?.probabilidad_fake);
  const finalAudioFakeProbability = Number(finalVerdict?.audio?.probabilidad_fake);
  const verdictPercent = Number.isFinite(finalVideoFakeProbability) && Number.isFinite(finalAudioFakeProbability)
    ? Math.round(((finalVideoFakeProbability + finalAudioFakeProbability) / 2) * 100)
    : finalVerdict?.veredicto_final
      ? Math.round(Number(finalVerdict.veredicto_final) * 100)
    : videoResult?.confidence
      ? parseInt(String(videoResult.confidence).replace('%', ''), 10) || 0
      : audioResult?.confidence
        ? parseInt(String(audioResult.confidence).replace('%', ''), 10) || 0
        : 0;
  const isFake = String(verdictRaw).toUpperCase() === 'FAKE' || String(verdictRaw).toUpperCase() === 'MANIPULADO';
  const videoConfidence = videoResult?.confidence ? parseInt(String(videoResult.confidence).replace('%', ''), 10) || 0 : 0;
  const audioWinningConfidence = audioResult?.confidence ? parseInt(String(audioResult.confidence).replace('%', ''), 10) || 0 : 0;
  const videoFakeConfidence = videoResult?.fakeConfidence
    ? parseInt(String(videoResult.fakeConfidence).replace('%', ''), 10) || 0
    : ['REAL', 'VERDADERO', 'ORIGINAL', 'BAJO RIESGO'].includes(String(videoResult?.verdict || '').toUpperCase())
      ? 100 - videoConfidence
      : videoConfidence;
  const audioConfidence = audioResult?.fakeConfidence
    ? parseInt(String(audioResult.fakeConfidence).replace('%', ''), 10) || 0
    : String(audioResult?.verdict || '').toUpperCase() === 'REAL'
      ? 100 - audioWinningConfidence
      : audioWinningConfidence;
  const dominantSignal = !hasAudioAnalysis || videoFakeConfidence >= audioConfidence ? 'Video' : 'Audio';
  const riskLevel = verdictPercent >= 80 ? 'Muy alto' : verdictPercent >= 60 ? 'Alto' : verdictPercent >= 40 ? 'Moderado' : 'Bajo';
  const verdictBasis = hasAudioAnalysis ? 'audio y video' : 'solo video';
  const verdictMethod = hasAudioAnalysis
    ? 'El resultado final se obtiene promediando la probabilidad de FAKE del video y del audio.'
    : 'El resultado final se calcula únicamente con la probabilidad de FAKE del video; no se detectó una pista de audio y, por tanto, el audio fue omitido.';

  const formatValue = (value, fallback = 'Sin dato') => (value !== null && value !== undefined && value !== '' ? value : fallback);

  const verificationResources = [
    {
      title: 'INCIBE',
      description: 'Guías de ciberseguridad y verificación básica',
      actionLabel: 'Abrir INCIBE',
      url: 'https://www.incibe.es/',
    },
    {
      title: 'JNE / Fact-checking',
      description: 'Consulta institucional y contraste de información',
      actionLabel: 'Abrir JNE',
      url: 'https://www.jne.gob.pe/',
    },
    {
      title: 'Portal Denuncias - Policía Nacional',
      description: 'Canal para reportar contenido sospechoso o fraudulento',
      actionLabel: 'Abrir portal',
      url: 'https://www.policia.gob.pe/',
    },
  ];

  const getPdfImageData = async (imageUrl) => {
    if (!imageUrl) {
      return null;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const sanitizePdfText = (value) => {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const drawSectionHeader = (pdf, title, x, y, width) => {
    pdf.setFillColor(37, 99, 235);
    pdf.roundedRect(x, y, width, 9, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, x + 3, y + 6.1);
    return y + 13;
  };

  const addPageFooter = (pdf, pageNumber, totalPages) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(226, 232, 240);
    pdf.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`RIQSSI - Reporte de resultados`, 14, pageHeight - 9);
    pdf.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 14, pageHeight - 9, { align: 'right' });
  };

  const handleDownloadPdf = async () => {
    setDownloadError('');
    setIsDownloadingPdf(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      const verdictColor = isFake ? [220, 38, 38] : [5, 150, 90];
      let y = 0;

      const ensureSpace = (needed) => {
        if (y + needed > pageHeight - 20) {
          pdf.addPage();
          y = 18;
        }
      };

      const drawCard = (height) => {
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(margin, y, contentWidth, height, 3, 3, 'FD');
      };

      const drawParagraph = (text, fontSize = 10, color = [51, 65, 85]) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(sanitizePdfText(text), contentWidth - 10);
        const height = lines.length * fontSize * 0.42 + 9;
        ensureSpace(height);
        drawCard(height);
        pdf.setTextColor(...color);
        pdf.text(lines, margin + 5, y + 7);
        y += height + 6;
      };

      const startSection = (title, minHeight) => {
        ensureSpace(13 + minHeight);
        y = drawSectionHeader(pdf, title, margin, y, contentWidth);
      };

      // Encabezado
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageWidth, 30, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Reporte de resultados', margin, 14);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(219, 234, 254);
      pdf.text(`RIQSSI  |  Generado el ${new Date().toLocaleString('es-PE')}`, margin, 22);
      y = 38;

      // Tarjeta de video y veredicto
      const pdfVideoName = sanitizePdfText(formatValue(videoMeta?.nombrevideo || videoMeta?.hash_video, 'SIN NOMBRE'));
      const pdfVideoId = sanitizePdfText(formatValue(videoMeta?.hash_video?.slice(0, 16)?.toUpperCase(), 'SIN-ID'));
      const cardHeight = 38;
      drawCard(cardHeight);

      const imageData = await getPdfImageData(thumbnailUrl || '').catch(() => null);
      let textX = margin + 5;
      if (imageData) {
        const imageFormat = imageData.startsWith('data:image/png') ? 'PNG' : imageData.startsWith('data:image/webp') ? 'WEBP' : 'JPEG';
        try {
          pdf.addImage(imageData, imageFormat, margin + 4, y + 5, 48, 28, undefined, 'FAST');
          textX = margin + 58;
        } catch {
          // Sin miniatura si el formato no es compatible.
        }
      }

      const verdictBoxWidth = 46;
      const verdictBoxX = pageWidth - margin - verdictBoxWidth - 4;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text('VIDEO ANALIZADO', textX, y + 9);
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      const nameLines = pdf.splitTextToSize(pdfVideoName, verdictBoxX - textX - 4).slice(0, 2);
      pdf.text(nameLines, textX, y + 16);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`ID: ${pdfVideoId}`, textX, y + 16 + nameLines.length * 5 + 2);

      pdf.setFillColor(...verdictColor);
      pdf.roundedRect(verdictBoxX, y + 5, verdictBoxWidth, 28, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('VEREDICTO', verdictBoxX + verdictBoxWidth / 2, y + 11, { align: 'center' });
      pdf.setFontSize(15);
      pdf.text(sanitizePdfText(verdictText), verdictBoxX + verdictBoxWidth / 2, y + 19, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(`${verdictPercent || 0}% de FAKE`, verdictBoxX + verdictBoxWidth / 2, y + 28, { align: 'center' });
      y += cardHeight + 8;

      // Resumen
      startSection('Resumen principal', 20);
      drawParagraph(
        finalVerdict
          ? `El análisis de ${verdictBasis} concluye ${getVerdictDisplayLabel(finalVerdict.etiqueta)} con una probabilidad de contenido falso de ${verdictPercent || 0}%. Nivel de riesgo: ${riskLevel}. Señal dominante: ${dominantSignal}.`
          : 'El análisis forense se mostrará aquí una vez termine el procesamiento completo.'
      );

      // Desglose con barras
      const breakdownItems = [
        {
          label: `Video - Probabilidad de FAKE: ${videoFakeConfidence}%`,
          value: videoFakeConfidence,
          verdict: videoResult?.verdict || finalVerdict?.video?.etiqueta,
        },
        ...(hasAudioAnalysis
          ? [{
              label: `Audio - Probabilidad de FAKE: ${audioConfidence}%`,
              value: audioConfidence,
              verdict: audioResult?.verdict || finalVerdict?.audio?.etiqueta,
            }]
          : [{ label: 'Análisis de audio', omitted: true }]),
        { label: hasAudioAnalysis ? 'Resultado final (promedio)' : 'Resultado final (solo video)', value: verdictPercent, detail: finalVerdict?.etiqueta },
      ];
      const rowHeight = 16;
      startSection('Desglose de detección', breakdownItems.length * rowHeight + 6);
      drawCard(breakdownItems.length * rowHeight + 6);
      breakdownItems.forEach((item, index) => {
        const rowY = y + 8 + index * rowHeight;
        const value = Math.max(0, Math.min(100, Number(item.value) || 0));
        const barWidth = contentWidth - 10;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(51, 65, 85);
        pdf.text(item.label, margin + 5, rowY);
        if (item.omitted) {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 116, 139);
          pdf.text('OMITIDA - sin pista de audio', margin + 75, rowY);
        } else if (item.verdict) {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 116, 139);
          pdf.text(sanitizePdfText(getVerdictDisplayLabel(item.verdict)), margin + contentWidth - 5, rowY, { align: 'right' });
        } else if (item.detail) {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 116, 139);
          pdf.text(sanitizePdfText(getVerdictDisplayLabel(item.detail)), margin + 75, rowY);
        }
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        if (!item.omitted && !item.verdict) {
          pdf.text(`${value}%`, margin + contentWidth - 5, rowY, { align: 'right' });
        }
        if (!item.omitted) {
          pdf.setFillColor(226, 232, 240);
          pdf.roundedRect(margin + 5, rowY + 2.5, barWidth, 3, 1.5, 1.5, 'F');
        }
        if (!item.omitted && value > 0) {
          pdf.setFillColor(...(value >= 50 ? [220, 38, 38] : [5, 150, 90]));
          pdf.roundedRect(margin + 5, rowY + 2.5, Math.max(3, (barWidth * value) / 100), 3, 1.5, 1.5, 'F');
        }
      });
      y += breakdownItems.length * rowHeight + 12;

      // Metadatos
      const metadataRows = [
        ['Nombre', pdfVideoName],
        ['Hash SHA-256', sanitizePdfText(formatValue(videoMeta?.hash_video))],
        ['Duración', sanitizePdfText(formatValue(videoMeta?.duracion ? `${videoMeta.duracion} s` : 'Sin dato'))],
        ['Resolución', sanitizePdfText(formatValue(videoMeta?.resolucion))],
        ['Plataforma', sanitizePdfText(formatValue(videoMeta?.red_social))],
      ];
      startSection('Metadatos del archivo', 30);
      pdf.setFontSize(9);
      metadataRows.forEach(([label, value], index) => {
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(value, contentWidth - 50);
        const height = Math.max(8, lines.length * 4 + 4);
        ensureSpace(height);
        pdf.setFillColor(index % 2 === 0 ? 241 : 255, index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 249 : 255);
        pdf.rect(margin, y, contentWidth, height, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(100, 116, 139);
        pdf.text(label, margin + 4, y + 5.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(15, 23, 42);
        pdf.text(lines, margin + 46, y + 5.5);
        y += height;
      });
      y += 8;

      // Interpretación
      startSection('Interpretación y recomendación', 30);
      drawParagraph(
        finalVerdict
          ? `${verdictMethod} Un porcentaje mayor indica mayor probabilidad de contenido falso. Se recomienda contrastar este resultado con los metadatos y el material original antes de tomar decisiones. Este informe es un apoyo técnico y no reemplaza un peritaje oficial.`
          : 'El análisis forense se mostrará aquí una vez termine el procesamiento completo.'
      );

      if (isFake && finalVerdict) {
        startSection('Recursos de verificación', verificationResources.length * 12);
        verificationResources.forEach((resource) => {
          ensureSpace(14);
          drawCard(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(15, 23, 42);
          pdf.text(sanitizePdfText(resource.title), margin + 5, y + 5);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(37, 99, 235);
          pdf.textWithLink(resource.url, margin + 5, y + 9.5, { url: resource.url });
          pdf.setTextColor(100, 116, 139);
          pdf.text(sanitizePdfText(resource.description), margin + 70, y + 7, { maxWidth: contentWidth - 75 });
          y += 14;
        });
      }

      const fileName = `reporte-veracidad-${videoMeta?.hash_video || 'riqssi'}.pdf`;
      const totalPages = pdf.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        pdf.setPage(pageNumber);
        addPageFooter(pdf, pageNumber, totalPages);
      }
      pdf.save(fileName);
    } catch (error) {
      setDownloadError(error?.message || 'No se pudo generar el PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  useEffect(() => {
    setAccessError('');

    if (!user?.nombreuser || !videoMeta?.hash_video) {
      return;
    }

    let cancelled = false;

    const validateOwnership = async () => {
      try {
        await getExistingAnalysisReport(videoMeta.hash_video, user.nombreuser);
        if (!cancelled) {
          setAccessError('');
        }
      } catch (error) {
        if (!cancelled) {
          setAccessError(error?.status === 404 ? 'Este reporte no pertenece a tu usuario.' : (error?.message || 'No se pudo validar el reporte.'));
        }
      }
    };

    validateOwnership();

    return () => {
      cancelled = true;
    };
  }, [user?.nombreuser, videoMeta?.hash_video]);

  useEffect(() => {
    // register that this user consulted this video
    if (user && videoMeta?.hash_video && !accessError) {
      try {
        fetch(`${API_URL}/historial/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_nombreuser: user.nombreuser, video_hash_video: videoMeta.hash_video, estado: 'VISTO' }),
        }).catch(() => {});
      } catch {
        // Ignore failed history registration; the report remains usable.
      }
    }
  }, [user, videoMeta, accessError]);

  if (accessError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {accessError}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Report Identification */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900" style={{ color: '#2563eb' }} >Reporte de resultados</h1>
        </div>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          className="bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 flex items-center gap-2 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          {isDownloadingPdf ? 'GENERANDO PDF...' : 'DESCARGAR PDF'}
        </button>
      </div>

      {downloadError ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {downloadError}
        </div>
      ) : null}

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Probability Gauge Card */}
        <section className="lg:col-span-4 bg-white border border-slate-100 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="mb-3 w-full max-w-xs rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Video analizado</div>
            <div className="mt-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Nombre</div>
              <div className="mt-1 text-sm font-semibold leading-snug text-slate-900 wrap-break-word">
                {analysisResult?.download?.video?.nombrevideo || analysisResult?.download?.video?.hash_video || 'SIN NOMBRE'}
              </div>
            </div>
            <div className="mt-3 border-t border-slate-200 pt-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">ID</div>
              <div className="mt-1 break-all font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                {analysisResult?.download?.video?.hash_video?.slice(0, 16)?.toUpperCase() || 'SIN-ID'}
              </div>
            </div>
          </div>

          <h2
            className="text-2xl font-light mb-4 tracking-wide"
            style={{ color: isFake ? '#dc2626' : '#10b981' }}
          >
            Probabilidad Absoluta
          </h2>

          {/* Gauge Container */}
          <div className="relative mx-auto mb-8 h-52 w-52">
            <svg className="block h-full w-full" viewBox="0 0 200 200" aria-hidden="true">
              <circle 
                className="fill-none stroke-slate-100" 
                cx="100" cy="100" r="96" 
                strokeWidth="8"
              />
              <circle 
                className={`fill-none transition-all duration-1000 ease-out ${isFake ? 'stroke-red-500' : 'stroke-emerald-500'}`} 
                cx="100" cy="100" r="96" 
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="603"
                strokeDashoffset={603 * (1 - verdictPercent / 100)}
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={`mb-2 rounded-full px-3 py-1 text-[11px] font-black tracking-[0.25em] uppercase shadow-sm ${isFake ? 'bg-red-600 text-white ring-2 ring-red-200' : 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200'}`}>{isFake ? 'FAKE' : 'VERDADERO'}</span>
              <span className={`text-5xl font-bold leading-none ${isFake ? 'text-red-600 drop-shadow-sm' : 'text-emerald-600 drop-shadow-sm'}`}>{verdictPercent || 0}%</span>
            </div>
          </div>

          <p className="max-w-xs text-lg leading-relaxed text-slate-600">
            {finalVerdict ? `Veredicto final: ${finalVerdict.veredicto_final}.` : 'Aún no hay un veredicto final calculado para este archivo.'}
          </p>
          {finalVerdict ? (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
              {verdictMethod} Un porcentaje mayor indica mayor probabilidad de contenido falso.
            </p>
          ) : null}

          <div className="mt-6 w-full max-w-xs space-y-3 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Señal dominante</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{dominantSignal}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Nivel de riesgo</div>
                <div className={`mt-1 text-sm font-semibold ${isFake ? 'text-red-600' : 'text-emerald-600'}`}>{riskLevel}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Forensic Analysis Card */}
        <section className="lg:col-span-8 bg-white border border-slate-100 rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-6 flex justify-between items-center text-slate-900 font-semibold">
            <h2 className="text-xl"  style={{ color: '#2563eb' }} >Análisis Forense Facial</h2>
            <span className="bg-blue-50 text-blue-600 text-[10px] px-3 py-1 rounded-full border border-blue-200 uppercase font-bold">
              {finalVerdict ? 'ANÁLISIS COMPLETO' : 'MODO ESCANEO ACTIVO'}
            </span>
          </div>

          <div className="relative grow px-6 pb-6">
            <div className="relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-200 shadow-inner">
              <img 
                alt="Forensic Analysis Frame" 
                className="w-full h-full object-cover opacity-70" 
                src={thumbnailUrl || 'https://ojo-publico.com/sites/default/files/2026-03/Dise%C3%B1o%20sin%20t%C3%ADtulo%20-%202026-03-17T134533-compressed.jpg'}
              />
              {/* Scan Overlay Simulation */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-1/3 h-full border-x border-blue-500/40 bg-blue-500/10"></div>
              </div>
              {/* Viewer Controls */}
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button className="p-2 bg-white/90 rounded border border-slate-200 text-slate-700 hover:bg-white shadow-sm">
                  <Search className="h-4 w-4" />
                </button>
                <button className="p-2 bg-white/90 rounded border border-slate-200 text-slate-700 hover:bg-white shadow-sm">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Summary Box */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2 text-blue-600">
                <FileText className="h-4 w-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Resumen del peritaje técnico</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {finalVerdict
                  ? `El análisis de ${verdictBasis} concluye ${finalVerdict.etiqueta}${audioOmitted ? '. La fase de audio fue omitida porque el video no tiene pista de audio.' : '.'}`
                  : 'El análisis forense se mostrará aquí una vez termine el procesamiento completo.'}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        {/* Detection Breakdown */}
        <section className="flex h-full flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <SectionHeader
            icon={<span className="h-4 w-1 rounded bg-blue-600"></span>}
            title="Desglose de Detección"
            description="Distribución de señales que alimentan el veredicto final."
          />
          <div className="flex flex-col gap-2 text-slate-500">
            {[
              {
                label: `Video - Probabilidad de FAKE: ${videoFakeConfidence}%`,
                value: videoFakeConfidence,
                verdict: getVerdictDisplayLabel(videoResult?.verdict || finalVerdict?.video?.etiqueta),
                color: 'bg-blue-600',
              },
              ...(hasAudioAnalysis ? [{
                label: `Audio - Probabilidad de FAKE: ${audioConfidence}%`,
                value: audioConfidence,
                verdict: getVerdictDisplayLabel(audioResult?.verdict || finalVerdict?.audio?.etiqueta),
                color: 'bg-blue-400',
              }] : []),
            ].map((item) => (
              <div key={item.label} className="flex flex-col justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="mb-2 flex justify-between gap-3 text-xs uppercase font-semibold">
                  <span>{item.label}</span>
                  <span className="text-slate-900 font-bold">{item.verdict || 'Sin dato'}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className={`${item.color} h-full transition-all duration-1000`} style={{ width: `${item.value}%` }}></div>
                </div>
              </div>
            ))}
            {audioOmitted ? (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs font-semibold uppercase text-slate-500">
                Análisis de audio: OMITIDA (sin pista de audio)
              </div>
            ) : null}
          </div>
        </section>

        {/* File Metadata */}
        <section className="flex h-full flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <SectionHeader
            icon={<Info className="h-4 w-4 text-slate-400" />}
            title="Metadatos del Archivo"
            description="Información técnica básica del archivo analizado."
          />
          <div className="flex flex-col gap-2 text-xs">
            {[
              { label: 'Hash SHA-256', value: videoMeta?.hash_video || 'Sin hash' },
              { label: 'Duración', value: videoMeta?.duracion ? `${videoMeta.duracion} s` : 'Sin dato' },
              { label: 'Resolución', value: videoMeta?.resolucion || 'Sin dato' },
              { label: 'Plataforma', value: videoMeta?.red_social || 'Sin dato' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
                <span className="text-slate-500">{item.label}</span>
                <span className="max-w-[62%] break-all text-right text-slate-800 font-mono font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Verification Resources */}
        {isFake && finalVerdict ? <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <SectionHeader
            icon={<Search className="h-4 w-4 text-slate-400" />}
            title="Recursos de Verificación"
            description="Accesos rápidos para contrastar o denunciar el contenido."
          />
          <div className="space-y-2 text-xs">
            {verificationResources.map((resource, index) => (
              <div key={resource.title} className="relative overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-3 transition-colors hover:border-blue-200">
                <div className={`absolute left-0 top-0 h-full w-1 ${index === 0 ? 'bg-cyan-500' : index === 1 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                <div className="pl-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white ${index === 0 ? 'bg-cyan-500' : index === 1 ? 'bg-amber-500' : 'bg-rose-500'}`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold uppercase tracking-wide text-slate-800">{resource.title}</h4>
                      <p className="mt-1 max-w-xl text-[11px] font-medium leading-relaxed text-slate-600">{resource.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openExternalLink(resource.url)}
                    className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Maximize2 className="h-3 w-3" />
                    {resource.actionLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section> : null}
      </div>
    </div>
  );
}

// Register view in historial when ReportView is mounted
export function registerHistorial(user, videoHash) {
  const API_URL = import.meta.env.VITE_API_URL || 'https://riqssi-back.onrender.com';
  if (!user || !user.nombreuser || !videoHash) return;

  try {
    fetch(`${API_URL}/historial/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_nombreuser: user.nombreuser, video_hash_video: videoHash, estado: 'VISTO' }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}
