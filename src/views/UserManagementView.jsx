import { Users, Building2, BarChart3, Search, Filter, Download, LogIn, Pencil, Trash2, X, RefreshCw, Server, Database, BrainCircuit, HardDrive, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import VerificationsModal from '../components/VerificationsModal';

const PRIMARY_API_URL = import.meta.env.VITE_API_URL || 'https://riqssi-back.onrender.com';
const FALLBACK_API_URL = PRIMARY_API_URL.includes('localhost')
  ? PRIMARY_API_URL.replace('localhost', '127.0.0.1')
  : PRIMARY_API_URL.replace('127.0.0.1', 'localhost');
const API_URLS = PRIMARY_API_URL === FALLBACK_API_URL ? [PRIMARY_API_URL] : [PRIMARY_API_URL, FALLBACK_API_URL];

async function requestJson(path, options) {
  let lastError = null;
  const token = sessionStorage.getItem('riqssi.accessToken');
  const requestOptions = {
    ...options,
    headers: token
      ? { ...(options?.headers || {}), Authorization: `Bearer ${token}` }
      : options?.headers,
  };

  for (const apiUrl of API_URLS) {
    try {
      const response = await fetch(`${apiUrl}${path}`, requestOptions);
      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.detail || `Error HTTP ${response.status}: no se pudo procesar la solicitud`);
      }

      return data || {};
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(lastError?.message || 'No se pudo conectar al backend.');
}

function formatDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sin fecha';
  }

  return parsed.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) {
    return 'Sin fecha';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sin fecha';
  }

  return parsed.toLocaleString();
}

function getRoleLabel(role) {
  return String(role || '').toLowerCase() === 'admin' ? 'Administrador' : 'Cliente';
}

function getMembershipStatus(user) {
  const paymentStatus = String(user.payment_status || 'approved').toLowerCase();
  const membershipName = String(user.membership?.nombre || user.membership_code || 'free').toLowerCase();
  const expiration = user.membership_expiration || user.membership?.fechavenc;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const expirationKey = expiration ? String(expiration).slice(0, 10) : '';

  if (paymentStatus === 'canceled') return 'Cancelada';
  if (paymentStatus === 'expired' || (expirationKey && expirationKey < todayKey)) return 'Vencida';
  if (paymentStatus === 'pending') return 'Pendiente';
  if (paymentStatus === 'denied') return 'Denegada';
  if (String(user.role || '').toLowerCase() === 'admin') return 'Permanente';
  if (['basic', 'basico', 'básico', 'premium'].includes(membershipName)) return 'Activa';
  return 'Sin membresía';
}

function getMembershipStatusClass(status) {
  if (status === 'Activa' || status === 'Permanente') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Vencida' || status === 'Cancelada' || status === 'Denegada') return 'bg-red-100 text-red-700';
  if (status === 'Pendiente') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function getMembershipClass(name) {
  const normalized = String(name || '').toUpperCase();

  if (normalized.includes('PREMIUM')) {
    return 'bg-blue-600 text-white';
  }

  if (normalized.includes('PRO')) {
    return 'bg-cyan-600 text-white';
  }

  if (normalized.includes('BASICO') || normalized.includes('BASIC')) {
    return 'bg-slate-500 text-white';
  }

  return 'bg-slate-300 text-slate-700';
}

export default function UserManagementView({ user }) {
  const [summary, setSummary] = useState({ totalUsers: 0, premiumPlans: 0, analysesDone: 0, activity_total: 0, verifications: null });
  const [adminData, setAdminData] = useState({ users: [], memberships: [], recentActivity: [] });
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState('');
  const [selectedRole, setSelectedRole] = useState('user');
  const [savingMembership, setSavingMembership] = useState('');
  const [deletingUser, setDeletingUser] = useState('');
  const [reviewingPayment, setReviewingPayment] = useState('');
  const [systemStatus, setSystemStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [allActivity, setAllActivity] = useState(null);
  const [loadingAllLogs, setLoadingAllLogs] = useState(false);
  const [verificationsUser, setVerificationsUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadAdminData = async () => {
      setLoadingData(true);
      setError('');

      try {
        const [data, statusData] = await Promise.all([
          requestJson('/admin/dashboard-summary'),
          requestJson('/admin/system-status'),
        ]);

        if (!cancelled) {
          setSummary({
            totalUsers: Number(data?.total_users || 0),
            premiumPlans: Number(data?.premium_plans || 0),
            analysesDone: Number(data?.analyses_done || 0),
            activity_total: Number(data?.activity_total || 0),
            verifications: data?.verifications || null,
          });
          setAdminData({
            users: Array.isArray(data?.users) ? data.users : [],
            memberships: Array.isArray(data?.memberships) ? data.memberships : [],
            recentActivity: Array.isArray(data?.recent_activity) ? data.recent_activity : [],
          });
          setSystemStatus(statusData);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'No se pudo cargar el panel de usuarios.');
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
          setLoadingStatus(false);
        }
      }
    };

    loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleReloadData = async () => {
    try {
      setLoadingStatus(true);
      const [data, statusData] = await Promise.all([
        requestJson('/admin/dashboard-summary'),
        requestJson('/admin/system-status'),
      ]);
      setSummary({
        totalUsers: Number(data?.total_users || 0),
        premiumPlans: Number(data?.premium_plans || 0),
        analysesDone: Number(data?.analyses_done || 0),
        activity_total: Number(data?.activity_total || 0),
        verifications: data?.verifications || null,
      });
      setAdminData({
        users: Array.isArray(data?.users) ? data.users : [],
        memberships: Array.isArray(data?.memberships) ? data.memberships : [],
        recentActivity: Array.isArray(data?.recent_activity) ? data.recent_activity : [],
      });
      setSystemStatus(statusData);
    } catch (loadError) {
      setError(loadError?.message || 'No se pudo refrescar el panel.');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleEditMembership = (user) => {
    setError('');
    setEditingUser(user);
    setSelectedMembershipId(String(user?.membership?.idmembresia || ''));
    setSelectedRole(String(user?.role || 'user').toLowerCase());
  };

  const handleDeleteUser = async (user) => {
    if (!user?.nombreuser) {
      return;
    }

    const confirmed = window.confirm(`¿Eliminar a ${user.nombre || user.nombreuser}? Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }

    setDeletingUser(user.nombreuser);
    setError('');

    try {
      await requestJson(`/account/${encodeURIComponent(user.nombreuser)}`, { method: 'DELETE' });
      await handleReloadData();
    } catch (deleteError) {
      setError(deleteError?.message || 'No se pudo eliminar el usuario.');
    } finally {
      setDeletingUser('');
    }
  };

  const handleSaveMembership = async () => {
    if (!editingUser?.nombreuser) {
      return;
    }

    const currentRole = String(editingUser.role || 'user').toLowerCase();
    const roleChanged = selectedRole !== currentRole;
    const membershipChanged = selectedMembershipId !== String(editingUser.membership?.idmembresia || '');
    const targetIsAdmin = selectedRole === 'admin';

    if (!targetIsAdmin && membershipChanged && !selectedMembershipId) {
      setError('Selecciona una membresía válida.');
      return;
    }

    setSavingMembership(editingUser.nombreuser);
    setError('');

    try {
      const username = encodeURIComponent(editingUser.nombreuser);
      if (roleChanged) {
        await requestJson(`/admin/users/${username}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: selectedRole }),
        });
      }
      // Los administradores son Premium permanente; su membresía no se edita.
      if (membershipChanged && !targetIsAdmin) {
        await requestJson(`/admin/users/${username}/membership`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ membresia_id: Number(selectedMembershipId) }),
        });
      }
      setEditingUser(null);
      setSelectedMembershipId('');
      await handleReloadData();
    } catch (saveError) {
      setError(saveError?.message || 'No se pudo actualizar el usuario.');
    } finally {
      setSavingMembership('');
    }
  };

  const handleReviewPayment = async (targetUser, decision) => {
    setReviewingPayment(targetUser.nombreuser);
    setError('');
    try {
      await requestJson(`/admin/payments/${encodeURIComponent(targetUser.nombreuser)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: decision, admin_nombreuser: user?.nombreuser }),
      });
      await handleReloadData();
    } catch (reviewError) {
      setError(reviewError?.message || 'No se pudo revisar el pago.');
    } finally {
      setReviewingPayment('');
    }
  };

  const filteredUsers = adminData.users.filter((adminUser) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch = !search || [adminUser.nombreuser, adminUser.nombre, adminUser.apellido, adminUser.correo]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
    const membershipCode = String(adminUser.membership?.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const matchesMembership = membershipFilter === 'all' || membershipCode === membershipFilter;
    const matchesPayment = paymentFilter === 'all' || String(adminUser.payment_status || 'approved').toLowerCase() === paymentFilter;
    return matchesSearch && matchesMembership && matchesPayment;
  });

  const exportUsers = (format) => {
    const headers = ['Usuario', 'Nombre', 'Correo', 'Rol', 'Membresia', 'Fecha de inicio', 'Vencimiento', 'Estado'];
    const rows = filteredUsers.map((adminUser) => [
      adminUser.nombreuser,
      [adminUser.nombre, adminUser.apellido].filter(Boolean).join(' '),
      adminUser.correo || '',
      getRoleLabel(adminUser.role),
      adminUser.membership?.nombre || 'free',
      formatDate(adminUser.membership_started_at),
      formatDate(adminUser.membership_expiration || adminUser.membership?.fechavenc),
      getMembershipStatus(adminUser),
    ]);
    const escapeCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
    const mime = format === 'xlsx' ? 'application/vnd.ms-excel' : 'text/csv;charset=utf-8';
    const extension = format === 'xlsx' ? 'xls' : 'csv';
    const blob = new Blob([`\ufeff${csv}`], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios-riqssi.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printUsers = () => {
    const rows = filteredUsers.map((adminUser) => `<tr><td>${adminUser.nombreuser}</td><td>${[adminUser.nombre, adminUser.apellido].filter(Boolean).join(' ')}</td><td>${adminUser.correo || ''}</td><td>${getRoleLabel(adminUser.role)}</td><td>${adminUser.membership?.nombre || 'free'}</td><td>${formatDate(adminUser.membership_started_at)}</td><td>${formatDate(adminUser.membership_expiration || adminUser.membership?.fechavenc)}</td><td>${getMembershipStatus(adminUser)}</td></tr>`).join('');
    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Usuarios RIQSSI</title><style>body{font-family:Arial;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#e2e8f0}</style></head><body><h1>Usuarios RIQSSI</h1><table><thead><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Membresia</th><th>Fecha de inicio</th><th>Vencimiento</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleToggleAllLogs = async () => {
    if (showAllLogs) {
      setShowAllLogs(false);
      return;
    }
    if (!allActivity) {
      setLoadingAllLogs(true);
      try {
        const data = await requestJson('/admin/activity?limit=1000');
        setAllActivity(Array.isArray(data?.activity) ? data.activity : []);
      } catch (loadError) {
        setError(loadError?.message || 'No se pudieron cargar todos los logs.');
        return;
      } finally {
        setLoadingAllLogs(false);
      }
    }
    setShowAllLogs(true);
  };

  return (
    <div className="container mx-auto p-8">
      <section className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900" style={{ color: '#2563eb' }}>Gestión de Usuarios</h1>
            <p className="text-slate-500 mt-2">Administra los accesos del sistema forense, monitorea niveles de membresía y controla los permisos de análisis de red.</p>
          </section>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard title="Total Usuarios" value={loadingData ? '—' : summary.totalUsers.toLocaleString()} icon={<Users className="w-5 h-5" />} />
        <MetricCard title="Planes Premium" value={loadingData ? '—' : summary.premiumPlans.toLocaleString()} icon={<Building2 className="w-5 h-5" />} />
        <MetricCard title="Análisis Realizados" value={loadingData ? '—' : summary.analysesDone.toLocaleString()} icon={<BarChart3 className="w-5 h-5" />} onClick={() => setVerificationsUser({ name: 'Todos los usuarios', verifications: summary.verifications })} />
      </section>

      <section className="bg-white rounded border border-slate-200 shadow-sm mb-8 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Estado del sistema</h2>
            <p className="mt-1 text-sm text-slate-500">
              {systemStatus?.checked_at ? `Última comprobación: ${formatDateTime(systemStatus.checked_at)}` : 'Comprobando servicios...'}
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onClick={handleReloadData}
            disabled={loadingStatus || loadingData}
            type="button"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SystemStatusCard title="API" item={{ status: 'operativo', detail: 'Servicio disponible' }} icon={<Server className="h-5 w-5" />} />
          <SystemStatusCard title="Base de datos" item={systemStatus?.components?.database} icon={<Database className="h-5 w-5" />} loading={loadingStatus} />
          <SystemStatusCard title="Modelos de análisis" item={{ status: systemStatus?.components?.audio_model?.status === 'operativo' && systemStatus?.components?.video_model?.status === 'operativo' ? 'operativo' : 'error', detail: `Audio: ${systemStatus?.components?.audio_model?.status || '...'} · Video: ${systemStatus?.components?.video_model?.status || '...'}` }} icon={<BrainCircuit className="h-5 w-5" />} loading={loadingStatus} />
          <SystemStatusCard title="Almacenamiento" item={systemStatus?.components?.storage} icon={<HardDrive className="h-5 w-5" />} loading={loadingStatus} />
        </div>
      </section>

      <section className="bg-white rounded border border-slate-200 shadow-sm mb-8 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 gap-3">
          <div className="relative w-full max-w-md">
            <input
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 outline-none" 
              placeholder="Buscar por usuario o correo..." 
              type="text" 
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowFilters((current) => !current)} className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded hover:bg-slate-50 flex items-center gap-2" type="button">
              <Filter className="w-3 h-3" />
              Filtrar
            </button>
            <button onClick={() => exportUsers('csv')} className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded hover:bg-slate-50 flex items-center gap-2" type="button">
              <Download className="w-3 h-3" />
              CSV
            </button>
            <button onClick={() => exportUsers('xlsx')} className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded hover:bg-slate-50" type="button">Excel</button>
            <button onClick={printUsers} className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded hover:bg-slate-50" type="button">PDF</button>
          </div>
        </div>

        {showFilters ? (
          <div className="flex flex-wrap gap-3 border-b border-slate-100 bg-slate-50/60 p-4">
            <select className="rounded border border-slate-200 bg-white px-3 py-2 text-xs" value={membershipFilter} onChange={(event) => setMembershipFilter(event.target.value)}>
              <option value="all">Todas las membresías</option>
              <option value="free">Gratis</option>
              <option value="basic">Básico</option>
              <option value="premium">Premium</option>
            </select>
            <select className="rounded border border-slate-200 bg-white px-3 py-2 text-xs" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
              <option value="all">Todos los pagos</option>
              <option value="approved">Aprobado</option>
              <option value="pending">Pendiente</option>
              <option value="denied">Denegado</option>
              <option value="expired">Expirado</option>
              <option value="canceled">Cancelado</option>
            </select>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-slate-200">
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Correo</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Plan actual</th>
                <th className="px-6 py-4">Fecha de inicio</th>
                <th className="px-6 py-4">Fecha de vencimiento</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loadingData && adminData.users.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-500" colSpan={8}>
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filteredUsers.length ? (
                filteredUsers.map((user) => {
                  const fullName = [user.nombre, user.apellido].filter(Boolean).join(' ') || user.nombreuser;
                  const membershipName = user.membership?.nombre || 'Sin membresía';
                  const membershipStatus = getMembershipStatus(user);
                  const paymentStatus = String(user.payment_status || 'approved').toLowerCase();
                  const initials = String(fullName || user.nombreuser || 'RI').trim().slice(0, 2).toUpperCase();

                  return (
                    <tr key={user.nombreuser} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${getMembershipClass(membershipName)}`}>
                          {initials}
                        </div>
                        <span className="font-medium text-slate-900">{fullName}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{user.correo || 'Sin correo'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold ${String(user.role || '').toLowerCase() === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded ${getMembershipClass(membershipName)}`}>
                          {membershipName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={user.membership_started_at ? 'text-slate-600' : 'text-slate-400'}>
                          {formatDate(user.membership_started_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={user.membership?.fechavenc ? 'text-slate-600' : 'text-slate-400'}>
                          {formatDate(user.membership_expiration || user.membership?.fechavenc)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${getMembershipStatusClass(membershipStatus)}`}>
                          {membershipStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60"
                            onClick={() => handleEditMembership(user)}
                            type="button"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Cambiar plan
                          </button>
                          {paymentStatus === 'pending' ? (
                            <>
                              {user.payment_proof_path ? <a className="rounded-md border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50" href={`${PRIMARY_API_URL}/${String(user.payment_proof_path).replace(/^\//, '')}`} target="_blank" rel="noreferrer">Ver comprobante</a> : null}
                              <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60" disabled={reviewingPayment === user.nombreuser} onClick={() => handleReviewPayment(user, 'approved')} type="button">Aprobar pago</button>
                              <button className="rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60" disabled={reviewingPayment === user.nombreuser} onClick={() => handleReviewPayment(user, 'rejected')} type="button">Rechazar pago</button>
                            </>
                          ) : null}
                          <button
                            className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60"
                            onClick={() => handleDeleteUser(user)}
                            disabled={deletingUser === user.nombreuser}
                            type="button"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingUser === user.nombreuser ? 'Borrando...' : 'Borrar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-500" colSpan={8}>
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Mostrando {filteredUsers.length} de {summary.totalUsers.toLocaleString()} usuarios
          </span>
          <span className="text-slate-400 font-medium">
            Datos cargados desde el backend
          </span>
        </div>
      </section>

      <section className="bg-white rounded border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center mb-6">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Logs de Actividad Reciente
        </h3>

        {(showAllLogs ? (allActivity || adminData.recentActivity) : adminData.recentActivity.slice(0, 5)).length ? (
          <div className="space-y-4">
            {(showAllLogs ? (allActivity || adminData.recentActivity) : adminData.recentActivity.slice(0, 5)).map((entry) => {
              const entryName = [entry.usuario_nombre, entry.usuario_apellido].filter(Boolean).join(' ') || entry.usuario_nombreuser;

              return (
                <div key={entry.idhistorial} className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <LogIn className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 grow">
                    <p className="text-sm font-semibold text-slate-900">{entryName}</p>
                    <p className="text-sm text-slate-600">{entry.accion}</p>
                    <p className="mt-1 text-[11px] uppercase font-bold tracking-tight text-slate-400">
                      {entry.correo || 'Sin correo'} · {entry.video_nombre || entry.video_hash_video} · {formatDateTime(entry.fecha_consulta)}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 border border-blue-100">
                    {entry.estado || 'VISTO'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No hay actividad reciente registrada.</p>
        )}
        {Number(summary.activity_total || 0) > 5 ? (
          <button className="mt-5 text-sm font-semibold text-blue-600 hover:underline disabled:opacity-60" disabled={loadingAllLogs} onClick={handleToggleAllLogs} type="button">
            {loadingAllLogs ? 'Cargando...' : showAllLogs ? 'Mostrar solo 5' : 'Ver todos'}
          </button>
        ) : null}
      </section>

      {editingUser ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => !savingMembership && setEditingUser(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Editar rol y membresía</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {editingUser.nombre || editingUser.nombreuser} · membresía y rol.
                </p>
              </div>
              <button
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                onClick={() => !savingMembership && setEditingUser(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="roleSelect">
              Rol
            </label>
            <select
              id="roleSelect"
              className="mb-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>

            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="membershipSelect">
              Membresía
            </label>
            <select
              id="membershipSelect"
              disabled={selectedRole === 'admin'}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
              value={selectedMembershipId}
              onChange={(event) => setSelectedMembershipId(event.target.value)}
            >
              <option value="">Selecciona una membresía</option>
              {adminData.memberships.map((membership) => (
                <option
                  key={membership.idmembresia}
                  value={membership.idmembresia}
                >
                  {membership.nombre}
                </option>
              ))}
            </select>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => !savingMembership && setEditingUser(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                disabled={savingMembership === editingUser.nombreuser || (selectedRole !== 'admin' && !selectedMembershipId)}
                onClick={handleSaveMembership}
                type="button"
              >
                {savingMembership === editingUser.nombreuser ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {verificationsUser ? (
        <VerificationsModal
          userName={verificationsUser.name}
          verifications={verificationsUser.verifications}
          onClose={() => setVerificationsUser(null)}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ title, value, icon, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      {...(onClick ? { onClick, type: 'button', title: 'Ver % Verdadero vs Fake' } : {})}
      className={`bg-white p-6 rounded border border-slate-200 shadow-sm flex flex-col justify-between h-40 text-left ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md transition' : ''}`}
    >
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</span>
        <div className="text-blue-600">{icon}</div>
      </div>
      <div className="mt-4">
        <span className="text-4xl font-bold text-slate-900">{value}</span>
      </div>
    </Wrapper>
  );
}

function SystemStatusCard({ title, item, icon, loading }) {
  const status = loading ? 'cargando' : item?.status || 'error';
  const statusStyles = {
    operativo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    advertencia: 'border-amber-200 bg-amber-50 text-amber-700',
    error: 'border-red-200 bg-red-50 text-red-700',
    cargando: 'border-slate-200 bg-slate-50 text-slate-500',
  };
  const StatusIcon = status === 'operativo' ? CheckCircle2 : status === 'advertencia' ? AlertTriangle : XCircle;

  return (
    <div className={`rounded-lg border p-4 ${statusStyles[status] || statusStyles.error}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</span>
        <StatusIcon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide">{status}</p>
      <p className="mt-1 text-xs opacity-80">{loading ? 'Consultando...' : item?.detail || 'Sin información'}</p>
    </div>
  );
}