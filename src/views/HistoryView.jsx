import { Search, RefreshCw, Calendar, Clock, Eye, Download, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { View } from '../types';
import { useEffect, useMemo, useState } from 'react';
import { getUserHistory } from '../services/linkService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getThumbnailUrl(thumbnailPath) {
  if (!thumbnailPath) return null;
  if (/^https?:\/\//i.test(thumbnailPath)) return thumbnailPath;
  const normalized = thumbnailPath.replace(/\\/g, '/');
  if (/^\/storage\//i.test(normalized)) return `${API_URL}${normalized}`;
  if (normalized.toLowerCase().startsWith('storage/')) return `${API_URL}/${normalized}`;
  const idx = normalized.toLowerCase().indexOf('/storage/');
  if (idx >= 0) return `${API_URL}${normalized.slice(idx)}`;
  return `${API_URL}/${normalized.replace(/^\/?/, '')}`;
}

function normalizeHistoryEntries(entries) {
  const latestByVideo = new Map();

  entries.forEach((item) => {
    const videoHash = item.video?.hash_video || item.video?.video_hash_video || item.video?.id || item.idhistorial;
    const rawDate = item.fecha_consulta || null;
    const previous = latestByVideo.get(videoHash);

    if (!previous) {
      latestByVideo.set(videoHash, item);
      return;
    }

    const previousDate = previous.fecha_consulta || null;
    const currentTime = rawDate ? new Date(rawDate).getTime() : -1;
    const previousTime = previousDate ? new Date(previousDate).getTime() : -1;

    if (currentTime > previousTime) {
      latestByVideo.set(videoHash, item);
    }
  });

  return Array.from(latestByVideo.values());
}

function getVerdictLabel(report) {
  const verdict = report?.resultado_total?.etiqueta_final || report?.status || '';
  return String(verdict).trim().toUpperCase();
}

function getVerdictDisplayLabel(verdict) {
  const normalized = String(verdict || '').trim().toUpperCase();

  if (normalized === 'MANIPULADO' || normalized === 'FAKE') {
    return 'FAKE';
  }

  if (normalized === 'ORIGINAL' || normalized === 'VERDADERO') {
    return 'VERDADERO';
  }

  if (normalized === 'BAJO RIESGO') {
    return 'VERDADERO';
  }

  return verdict || 'SIN DATOS';
}

function getVerdictGroup(verdict) {
  const normalized = String(verdict || '').trim().toUpperCase();

  if (normalized === 'MANIPULADO' || normalized === 'FAKE' || normalized === 'ALTO RIESGO') {
    return 'FAKE';
  }

  if (normalized === 'ORIGINAL' || normalized === 'VERDADERO' || normalized === 'BAJO RIESGO') {
    return 'VERDADERO';
  }

  return 'VERDADERO';
}

function isReportWithinDateFilter(rawDate, filterValue) {
  if (filterValue === 'ALL') {
    return true;
  }

  if (!rawDate) {
    return false;
  }

  const reportDate = new Date(rawDate);
  if (Number.isNaN(reportDate.getTime())) {
    return false;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfReportDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());

  if (filterValue === 'TODAY') {
    return startOfReportDay.getTime() === startOfToday.getTime();
  }

  if (filterValue === 'LAST_7_DAYS') {
    const threshold = new Date(startOfToday);
    threshold.setDate(threshold.getDate() - 7);
    return startOfReportDay.getTime() >= threshold.getTime();
  }

  if (filterValue === 'LAST_30_DAYS') {
    const threshold = new Date(startOfToday);
    threshold.setDate(threshold.getDate() - 30);
    return startOfReportDay.getTime() >= threshold.getTime();
  }

  return true;
}

export default function HistoryView({ setView, user, onOpenReport }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const itemsPerPage = 6;

  const loadHistory = async () => {
    if (!user?.nombreuser) {
      setReports([]);
      setCurrentPage(1);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getUserHistory(user.nombreuser);
      const mapped = (data.history || []).map((item) => {
        let date = '';
        let time = '';
        const rawFecha = item.fecha_consulta || null;
        const videoHash = item.video?.hash_video || item.video?.video_hash_video || item.video?.id || '';

        if (item.fecha_consulta) {
          try {
            const d = new Date(item.fecha_consulta);
            date = d.toLocaleDateString();
            time = d.toLocaleTimeString();
          } catch {
            // Ignore malformed dates and keep the history entry visible.
          }
        }

        return {
          id: String(item.idhistorial),
          fileId: String(videoHash || item.idhistorial),
          videoHash: String(videoHash || ''),
          filename: item.video?.nombrevideo || item.video?.hash_video,
          rawFecha,
          date,
          time,
          status: item.estado || 'VISTO',
          probability: 0,
          thumbnail: item.video?.thumbnail_path ? getThumbnailUrl(item.video.thumbnail_path) : null,
          video: item.video,
          resultado_total: item.resultado_total || null,
        };
      });

      mapped.sort((a, b) => {
        if (a.rawFecha && b.rawFecha) return new Date(b.rawFecha) - new Date(a.rawFecha);
        if (a.rawFecha) return -1;
        if (b.rawFecha) return 1;
        return 0;
      });

      const uniqueReports = normalizeHistoryEntries(mapped);

      setReports(uniqueReports);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // loadHistory is recreated on render but only depends on the current user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.nombreuser]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch = !normalizedSearch || [report.filename, report.id, report.fileId, report.videoHash]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const verdictLabel = getVerdictLabel(report);
      const matchesVerdict = verdictFilter === 'ALL' || getVerdictGroup(verdictLabel) === verdictFilter;

      const matchesDate = isReportWithinDateFilter(report.rawFecha, dateFilter);

      return matchesSearch && matchesVerdict && matchesDate;
    });
  }, [reports, searchTerm, verdictFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedReports = filteredReports.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);
  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, verdictFilter, dateFilter]);

  return (
    <div className="container mx-auto px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2" style={{ color: '#2563eb' }}>Historial de Verificaciones</h1>
          <p className="text-slate-500">Gestione y revise los análisis forenses realizados previamente por el sistema.</p>
        </div>
        <div className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full border border-blue-100 uppercase">
          Total: {filteredReports.length || 0} Escaneos
        </div>
      </div>

      <section className="flex flex-col lg:flex-row gap-4 mb-10">
        <div className="relative grow">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-md text-sm focus:ring-blue-600 outline-none" 
            placeholder="Buscar por nombre de archivo o ID..." 
            type="text" 
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="flex flex-col xl:flex-row gap-3">
          <select
            className="bg-white border border-slate-200 rounded-md text-sm py-2.5 px-4 pr-10 focus:ring-blue-600 outline-none text-slate-700"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          >
            <option value="ALL">FECHA: TODAS</option>
            <option value="TODAY">FECHA: HOY</option>
            <option value="LAST_7_DAYS">FECHA: ÚLTIMOS 7 DÍAS</option>
            <option value="LAST_30_DAYS">FECHA: ÚLTIMOS 30 DÍAS</option>
          </select>
          <select
            className="bg-white border border-slate-200 rounded-md text-sm py-2.5 px-4 pr-10 focus:ring-blue-600 outline-none text-slate-700"
            value={verdictFilter}
            onChange={(event) => setVerdictFilter(event.target.value)}
          >
            <option value="ALL">VEREDICTO: TODOS</option>
            <option value="FAKE">VEREDICTO: FAKE</option>
            <option value="VERDADERO">VEREDICTO: VERDADERO</option>
          </select>
          <button
            onClick={loadHistory}
            disabled={loading}
            className="bg-blue-100 hover:bg-blue-200 disabled:opacity-60 text-blue-600 px-6 py-2.5 rounded-md text-sm font-bold flex items-center gap-2 transition-colors uppercase tracking-wide"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </section>

      <section className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="font-bold uppercase tracking-wide text-slate-600">Filtros activos:</span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Búsqueda: {searchTerm.trim() || 'Todas'}</span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Veredicto: {verdictFilter === 'ALL' ? 'Todos' : verdictFilter}</span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Fecha: {dateFilter === 'ALL' ? 'Todas' : dateFilter === 'TODAY' ? 'Hoy' : dateFilter === 'LAST_7_DAYS' ? 'Últimos 7 días' : 'Últimos 30 días'}</span>
      </section>

      

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : reports.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
            No tienes videos consultados aún.
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
            No hay resultados para los filtros seleccionados.
          </div>
        ) : (
          paginatedReports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full group hover:shadow-md transition-shadow">
              <div className="relative w-full h-44 overflow-hidden">
                <div className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider text-white ${
                  (report.resultado_total?.etiqueta_final || report.status) === 'MANIPULADO' ? 'bg-red-500' : (report.resultado_total?.etiqueta_final || report.status) === 'ORIGINAL' ? 'bg-green-500' : 'bg-blue-500'
                }`}>
                  {getVerdictDisplayLabel(report.resultado_total?.etiqueta_final || report.status)}
                </div>
                {report.thumbnail ? (
                  <div className="absolute inset-0">
                    <img src={report.thumbnail} alt="Preview" className="w-full h-full object-cover object-center" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 bg-white">
                    {(report.resultado_total?.etiqueta_final || report.status) === 'ORIGINAL' ? <CheckCircle className="w-12 h-12" /> : (report.resultado_total?.etiqueta_final || report.status) === 'BAJO RIESGO' ? <Shield className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
                  </div>
                )}
                <div className={`absolute bottom-3 left-3 flex items-center gap-2 font-bold text-sm ${
                  report.resultado_total ? (Number(report.resultado_total.veredicto_final) > 0.5 ? 'text-red-500' : 'text-green-500') : 'text-blue-500'
                }`}>
                  {report.resultado_total ? (
                    <>
                      {Number(report.resultado_total.veredicto_final) > 0.5 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      <span>{Math.round(Number(report.resultado_total.veredicto_final) * 100)}%</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>—</span>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4 grow">
                <h3 className="font-semibold text-slate-800 mb-1 truncate">{report.filename}</h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {report.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {report.time}</span>
                </div>
                {/* Mostrar último análisis si existe */}
                {report.resultado_total ? (
                  <button
                    onClick={() => {
                      if (typeof onOpenReport === 'function') {
                        onOpenReport(report);
                        return;
                      }
                      setView(View.REPORT);
                    }}
                    className="text-sm text-slate-700 mb-2 hover:underline flex items-center gap-2"
                    title="Abrir reporte completo"
                  >
                    <strong className="text-slate-800">Último análisis:</strong>
                    <span className={`font-medium ${Number(report.resultado_total.veredicto_final) > 0.5 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {getVerdictDisplayLabel(report.resultado_total.etiqueta_final || '—')}{report.resultado_total.veredicto_final != null ? ` — ${Math.round(Number(report.resultado_total.veredicto_final) * 100)}%` : ''}
                    </span>
                  </button>
                ) : null}
              </div>
              <div className="p-4 pt-0 flex gap-2">
                <button 
                  onClick={() => {
                    if (typeof onOpenReport === 'function') {
                      onOpenReport(report);
                      return;
                    }
                    setView(View.REPORT);
                  }}
                  className="grow border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold py-2 rounded flex items-center justify-center gap-2 uppercase tracking-wide transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Ver Reporte
                </button>
                <button className="w-10 border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center rounded transition-colors">
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    const ok = window.confirm('¿Eliminar este video de tu historial? Esta acción no se puede deshacer.');
                    if (!ok) return;
                    const url = `${API_URL}/historial/${encodeURIComponent(user.nombreuser)}/${report.id}`;
                    try {
                      // optimistically remove from UI
                      const previousReports = reports;
                      setReports((r) => r.filter((x) => x.id !== report.id));

                      const res = await fetch(url, { method: 'DELETE' });
                      if (!res.ok) {
                        // restore and show message
                        setReports(previousReports);
                        let text = '';
                        try { text = await res.text(); } catch {
                          // Ignore an unreadable error response.
                        }
                        alert(`Error al eliminar: ${res.status} ${text || res.statusText}`);
                        return;
                      }

                      // success — optionally reload to refresh ordering
                      await loadHistory();
                    } catch (err) {
                      // restore
                      setReports((r) => r.concat());
                      alert(err.message || 'Error al eliminar');
                    }
                  }}
                  title="Eliminar del historial"
                  className="w-10 border border-red-200 bg-white hover:bg-red-50 text-red-600 flex items-center justify-center rounded transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-.894.553L4 4H2a1 1 0 100 2h1v9a2 2 0 002 2h8a2 2 0 002-2V6h1a1 1 0 100-2h-2l-1.106-1.447A1 1 0 0014 2H6zm2 6a1 1 0 112 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-center items-center gap-2">
        <button
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          disabled={safeCurrentPage === 1}
          className="p-2 text-slate-400 hover:bg-slate-100 rounded disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {visiblePages.map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`w-8 h-8 flex items-center justify-center rounded font-bold text-sm ${page === safeCurrentPage ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 font-medium'}`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          disabled={safeCurrentPage === totalPages}
          className="p-2 text-slate-400 hover:bg-slate-100 rounded disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ChevronLeft(props) {
  return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>;
}

function ChevronRight(props) {
  return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>;
}