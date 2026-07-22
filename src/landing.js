import { createInitialState, loadState, resetState, STORAGE_KEY } from "./state.js";
import { createSharedComanda } from "./collaboration.js";

export function mountLanding({ onOpenLocal }) {
  const hasLocal = Boolean(localStorage.getItem(STORAGE_KEY));
  const app = document.querySelector("#app");

  app.innerHTML = `
    <main class="landing-shell">
      <header class="landing-hero">
        <span class="landing-mark">Comanda</span>
        <h1>Pedimos juntos, pagamos claro.</h1>
        <p>Organiza pedidos grupales, calcula deudas y registra pagos.</p>
      </header>

      <section class="mode-grid" aria-label="Elegir modo de uso">
        <article class="mode-card">
          <span class="mode-badge local">En este dispositivo</span>
          <h2>Comanda local</h2>
          <p>Ideal si una sola persona carga todo. Los datos quedan guardados en este navegador.</p>
          <div class="landing-actions">
            ${hasLocal ? `<button id="continueLocalBtn">Continuar comanda local</button>` : ""}
            <button class="ghost" id="newLocalBtn">Nueva comanda local</button>
          </div>
        </article>

        <article class="mode-card shared-card">
          <span class="mode-badge shared">Compartida</span>
          <h2>Comanda compartida</h2>
          <p>Crea un link temporal para que cada persona cargue su pedido, sin registrarse.</p>
          <form id="sharedForm" class="shared-create-form">
            <label for="sharedTitle">Nombre de la comanda</label>
            <input id="sharedTitle" required maxlength="100" placeholder="Ej: Empanadas viernes">
            <label for="sharedExpiration">Expira en</label>
            <select id="sharedExpiration">
              <option value="1">1 día</option>
              <option value="2" selected>2 días</option>
              <option value="7">7 días</option>
            </select>
            <button id="createSharedBtn" type="submit">Crear comanda compartida</button>
          </form>
          <p class="landing-error" id="createError" role="alert"></p>
        </article>
      </section>

      <section class="join-card">
        <div>
          <span class="mode-badge shared">Ya tengo un código</span>
          <h2>Unirse a una comanda</h2>
          <p>Ingresa el código que te compartieron.</p>
        </div>
        <form id="joinForm" class="join-form">
          <input id="joinCode" required autocomplete="off" maxlength="20" placeholder="CAMO-8K4P" aria-label="Código de comanda">
          <button type="submit">Unirse</button>
        </form>
      </section>

      <p class="landing-security">Las comandas compartidas son temporales. Cualquiera con el link público puede acceder; no cargues datos sensibles.</p>
    </main>
  `;

  document.querySelector("#continueLocalBtn")?.addEventListener("click", () => onOpenLocal(loadState()));
  document.querySelector("#newLocalBtn").addEventListener("click", () => {
    if (hasLocal && !confirm("¿Crear una comanda nueva y reemplazar la guardada en este navegador?")) return;
    onOpenLocal(resetState());
  });

  document.querySelector("#joinForm").addEventListener("submit", event => {
    event.preventDefault();
    const code = document.querySelector("#joinCode").value.trim().toUpperCase().replace(/\s+/g, "");
    if (code) window.location.assign(`/g/${encodeURIComponent(code)}`);
  });

  document.querySelector("#sharedForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = document.querySelector("#createSharedBtn");
    const errorBox = document.querySelector("#createError");
    const title = document.querySelector("#sharedTitle").value.trim();
    const expirationDays = Number(document.querySelector("#sharedExpiration").value);
    button.disabled = true;
    button.textContent = "Creando…";
    errorBox.textContent = "";

    try {
      const initialState = { ...createInitialState(), name: title };
      const created = await createSharedComanda(initialState, { title, expirationDays });
      window.location.assign(created.admin_url || `/g/${created.code}?admin=${encodeURIComponent(created.admin_token)}`);
    } catch (error) {
      errorBox.textContent = error.message || "No pudimos crear la comanda compartida.";
      button.disabled = false;
      button.textContent = "Crear comanda compartida";
    }
  });
}
