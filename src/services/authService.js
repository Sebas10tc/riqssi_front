const PRIMARY_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
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
      throw new Error(detail || `Error HTTP ${response.status}: no se pudo procesar la solicitud`);
    }

    return data || {};
  }

  throw new Error(
    'No se pudo conectar al backend. Verifica que la API esté encendida en ' +
      PRIMARY_API_URL +
      (lastError ? ` (${lastError.message || 'sin detalle'})` : '')
  );
}

export async function recoverPassword(correo) {
  return requestJson('/recover-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ correo }),
  });
}

export async function changePassword({ correo, nueva_clave }) {
  return requestJson('/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ correo, nueva_clave }),
  });
}

export async function deleteAccount(nombreuser) {
  return requestJson(`/account/${encodeURIComponent(nombreuser)}`, {
    method: 'DELETE',
  });
}

export async function getUserProfile(nombreuser) {
  return requestJson(`/account/${encodeURIComponent(nombreuser)}/profile`, {
    method: 'GET',
  });
}

export async function cancelMembership(nombreuser, motivo = '') {
  return requestJson('/membership/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nombreuser, motivo }),
  });
}
