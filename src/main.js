import "./styles.css";
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { loadState, normalizeState, saveState } from "./state.js";
import { mountApp } from "./ui.js";
import { mountLanding } from "./landing.js";
import {
  addOwnedPersonId,
  getAdminTokenFromUrl,
  getGroupCodeFromUrl,
  getOwnedPeopleIds,
  isExpiredComanda,
  isSharedMode,
  loadSharedComanda,
  updateSharedComanda
} from "./collaboration.js";

function renderLoadError(message, retry) {
  document.querySelector("#app").innerHTML = `
    <main class="state-screen">
      <div class="state-card">
        <span class="mode-badge shared">Comanda compartida</span>
        <h1>${message}</h1>
        <p>Revisa el código o intenta cargarla nuevamente.</p>
        <div class="landing-actions">
          <button id="retryBtn">Reintentar</button>
          <button class="ghost" id="homeBtn">Volver al inicio</button>
        </div>
      </div>
    </main>`;
  document.querySelector("#retryBtn").addEventListener("click", retry);
  document.querySelector("#homeBtn").addEventListener("click", () => window.location.assign("/"));
}

function openLocal(initialState = loadState()) {
  window.history.replaceState({}, "", "/?mode=local");
  let state = normalizeState(initialState);
  mountApp(state, nextState => {
    state = normalizeState(nextState);
    saveState(state);
    return state;
  }, { mode: "local" });
}

async function openShared() {
  const code = getGroupCodeFromUrl();
  const adminToken = getAdminTokenFromUrl();
  document.querySelector("#app").innerHTML = `<main class="state-screen"><div class="state-card"><div class="loading-spinner"></div><h1>Cargando comanda…</h1></div></main>`;

  try {
    let remote = await loadSharedComanda(code, adminToken);
    let state = normalizeState(remote.data);

    mountApp(state, async nextState => {
      const updated = await updateSharedComanda(remote.id, code, nextState, {
        adminToken,
        ownedPeopleIds: getOwnedPeopleIds(code),
        lastKnownUpdatedAt: remote.updated_at
      });
      remote = updated;
      state = normalizeState(updated.data);
      return state;
    }, {
      mode: "shared",
      code,
      adminToken,
      isAdmin: remote.isAdmin,
      expired: isExpiredComanda(remote),
      expiresAt: remote.expires_at,
      getRemote: () => remote,
      ownsPerson: personId => getOwnedPeopleIds(code).includes(personId),
      addOwnedPerson: personId => addOwnedPersonId(code, personId),
      onRefresh: async () => {
        remote = await loadSharedComanda(code, adminToken);
        return normalizeState(remote.data);
      }
    });
  } catch (error) {
    const message = error.status === 404
      ? "Comanda no encontrada."
      : error.status === 410
        ? "Esta comanda ya expiró."
        : "No pudimos cargar la comanda compartida.";
    renderLoadError(message, openShared);
  }
}

if (isSharedMode()) openShared();
else if (new URLSearchParams(window.location.search).get("mode") === "local") openLocal();
else mountLanding({ onOpenLocal: openLocal });

inject();
injectSpeedInsights();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
