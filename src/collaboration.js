function apiErrorMessage(status, payload) {
  if (payload?.error) return payload.error;
  if (status === 404) return "Comanda no encontrada.";
  if (status === 410) return "Esta comanda ya expiró.";
  return "No pudimos comunicarnos con la comanda compartida.";
}

async function request(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(apiErrorMessage(response.status, payload));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function getGroupCodeFromUrl() {
  const match = window.location.pathname.match(/^\/g\/([^/]+)\/?$/i);
  return match ? decodeURIComponent(match[1]).trim().toUpperCase() : null;
}

export function getAdminTokenFromUrl() {
  return new URLSearchParams(window.location.search).get("admin") || "";
}

export function isSharedMode() {
  return Boolean(getGroupCodeFromUrl());
}

export function createSharedComanda(initialState, options = {}) {
  return request("/api/comandas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: options.title || initialState.name || "Comanda compartida",
      data: initialState,
      expirationDays: options.expirationDays ?? 2,
      expirationHours: options.expirationHours
    })
  });
}

export function loadSharedComanda(code, adminToken = "") {
  const params = new URLSearchParams({ code });
  if (adminToken) params.set("admin", adminToken);
  return request(`/api/comandas?${params}`);
}

export function updateSharedComanda(remoteId, code, nextState, options = {}) {
  return request("/api/comandas", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: remoteId,
      code,
      adminToken: options.adminToken || undefined,
      data: nextState,
      ownedPeopleIds: options.ownedPeopleIds || [],
      lastKnownUpdatedAt: options.lastKnownUpdatedAt || undefined
    })
  });
}

export function isExpiredComanda(comanda) {
  return Boolean(comanda?.expired || comanda?.status === "expired" || (
    comanda?.expires_at && new Date(comanda.expires_at).getTime() <= Date.now()
  ));
}

export function getPublicShareUrl(code) {
  return `${window.location.origin}/g/${encodeURIComponent(code)}`;
}

export function getAdminShareUrl(code, adminToken) {
  return `${getPublicShareUrl(code)}?admin=${encodeURIComponent(adminToken)}`;
}

export function getOwnedPeopleIds(code) {
  try {
    return JSON.parse(localStorage.getItem(`comanda:${code}:ownedPeopleIds`) || "[]");
  } catch {
    return [];
  }
}

export function addOwnedPersonId(code, personId) {
  const ids = new Set(getOwnedPeopleIds(code));
  ids.add(personId);
  localStorage.setItem(`comanda:${code}:ownedPeopleIds`, JSON.stringify([...ids]));
}
