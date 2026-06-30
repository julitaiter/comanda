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
    people: []
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();

    const loaded = JSON.parse(raw);
    return {
      ...createInitialState(),
      ...loaded,
      adjustments: {
        ...createInitialState().adjustments,
        ...(loaded.adjustments || {})
      },
      catalog: {
        ...createInitialState().catalog,
        ...(loaded.catalog || {})
      },
      people: loaded.people || []
    };
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

  parsed.adjustments = {
    surcharge: 0,
    discount: 0,
    mode: "proportional",
    ...(parsed.adjustments || {})
  };

  saveState(parsed);
  return parsed;
}
