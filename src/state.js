export const STORAGE_KEY = "pedido_grupal_v2";

export function createInitialState() {
  return {
    name: "Comanda",
    closed: false,
    adjustments: {
      surcharge: 0,
      discount: 0,
      mode: "proportional"
    },
    catalog: {
      products: []
    },
    people: [],
    payments: []
  };
}

export function normalizeState(rawState = {}) {
  const initial = createInitialState();
  const loaded = rawState || {};

  return {
    ...initial,
    ...loaded,
    adjustments: {
      ...initial.adjustments,
      ...(loaded.adjustments || {})
    },
    catalog: {
      ...initial.catalog,
      ...(loaded.catalog || {})
    },
    people: Array.isArray(loaded.people) ? loaded.people : [],
    payments: Array.isArray(loaded.payments) ? loaded.payments : []
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();

    const loaded = JSON.parse(raw);
    return normalizeState(loaded);
  } catch {
    return createInitialState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  const state = createInitialState();
  saveState(state);
  return state;
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `comanda-${date}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

export async function importStateFromFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!parsed || !Array.isArray(parsed.people)) {
    throw new Error("El archivo no parece ser un pedido válido.");
  }

  const normalized = normalizeState(parsed);

  saveState(normalized);
  return normalized;
}
