import { registerItemInCatalog, getOptionSuggestions, getProductByName, getProductSuggestions, getUnitSuggestions } from "./catalog.js";
import { normalizeOption, normalizeProduct, money, pluralizeUnit, formatQuantity, prettyName } from "./normalize.js";
import { calculateTotals, getTotalUnitsText } from "./totals.js";
import { generateDebtsText, generateFullSummaryText, generateStoreText, adjustmentModeLabel } from "./texts.js";
import { copyText, el, showToast } from "./dom.js";
import { exportState, importStateFromFile, resetState, saveState } from "./state.js";

let state;
let rerender;

export function mountApp(initialState, onStateChange) {
  state = initialState;
  rerender = onStateChange;

  document.querySelector("#app").innerHTML = `
    <div class="app">
      <section class="hero">
        <div class="hero-main">
          <div class="eyebrow">Comanda</div>
          <h1>Una comanda para toda la juntada.</h1>
          <p>
            Cargá lo que pidió cada uno, cerrá la cuenta, compartí el resumen y controlá quién pagó.
            Todo simple, desde el navegador.
          </p>
        </div>

        <div class="hero-side">
          <div class="stat-card">
            <span class="label">Total general</span>
            <span class="value" id="heroTotal">$0</span>
            <span class="sub" id="heroQuantity">0 unidades</span>
          </div>

          <div class="stat-card light">
            <span class="label">Estado</span>
            <span class="value" id="heroStatus">Abierto</span>
            <span class="sub" id="heroPeople">0 personas cargadas</span>
          </div>
        </div>
      </section>

      <main class="layout">
        <div class="left-col">
          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>Configuración</h2>
                <div class="hint">Nombre de la comanda, recargo/envío, descuento y forma de repartir el ajuste.</div>
              </div>
              <span class="status" id="statusPill">Abierto</span>
            </div>

            <div class="form-grid">
              <div class="field">
                <label for="orderName">Nombre de la comanda</label>
                <input id="orderName" type="text" placeholder="Ej: Viernes oficina">
              </div>

              <div class="field">
                <label for="surcharge">Recargo / envío</label>
                <input id="surcharge" type="number" min="0" step="1" placeholder="Ej: 1500">
              </div>

              <div class="field">
                <label for="discount">Descuento</label>
                <input id="discount" type="number" min="0" step="1" placeholder="Ej: 1000">
              </div>

              <div class="field">
                <label for="adjustmentMode">Dividir recargo/descuento</label>
                <select id="adjustmentMode">
                  <option value="proportional">Proporcional al consumo</option>
                  <option value="equal">Partes iguales</option>
                </select>
              </div>
            </div>

            <div class="actions">
              <button class="ghost" id="saveConfigBtn">Guardar configuración</button>
              <button class="ghost" id="exportBtn">Exportar JSON</button>
              <button class="ghost" id="importBtn">Importar JSON</button>
              <input id="importFile" class="file-input" type="file" accept="application/json">
              <button class="danger" id="resetBtn">Resetear todo</button>
            </div>

            <div class="footer-note">
              Datos locales: se guardan con <strong>localStorage</strong>. Para mover el pedido a otra máquina usá exportar/importar JSON.
            </div>
          </section>

          <section class="panel" id="loadPanel">
            <div class="panel-header">
              <div>
                <h2>Cargar persona</h2>
                <div class="hint">Cada renglón puede ser un producto distinto: empanadas, pizza, bebida, sanguches, etc.</div>
              </div>
            </div>

            <div class="field">
              <label for="personName">Nombre</label>
              <input id="personName" type="text" placeholder="Ej: Nico">
            </div>

            <datalist id="productSuggestions"></datalist>
            <datalist id="optionSuggestions"></datalist>
            <datalist id="unitSuggestions"></datalist>

            <div id="itemsContainer"></div>

            <div class="actions">
              <button class="ghost" id="addItemBtn">+ Agregar producto</button>
              <button id="savePersonBtn">Guardar persona</button>
            </div>
          </section>
        </div>

        <div>
          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>Resumen</h2>
                <div class="hint">Agrupado por producto para pedir y por persona para cobrar.</div>
              </div>
              <div class="actions" style="margin-top:0">
                <button class="green" id="closeBtn">Cerrar comanda</button>
                <button class="ghost" id="reopenBtn">Reabrir</button>
              </div>
            </div>

            <h3>Pedido para el local</h3>
            <div id="storeSummary" class="summary-box"></div>

            <h3>Total por persona</h3>
            <div id="peopleSummary" class="people-list"></div>

            <div class="divider"></div>

            <div class="summary-line">
              <span>Total general</span>
              <strong id="generalTotal">$0</strong>
            </div>

            <div class="actions">
              <button class="green" id="whatsappBtn">Compartir WhatsApp</button>
              <button class="secondary" id="copyFullBtn">Copiar resumen</button>
              <button class="ghost" id="copyStoreBtn">Copiar pedido local</button>
              <button class="ghost" id="copyDebtsBtn">Copiar deudas</button>
              <button class="ghost" id="printBtn">Imprimir</button>
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>Texto para compartir</h2>
                <div class="hint">Se genera automáticamente con los datos actuales.</div>
              </div>
            </div>
            <textarea id="shareText" readonly></textarea>
          </section>
        </div>
      </main>
    </div>

    <div class="toast" id="toast"></div>

    <footer class="app-footer">
  <p><strong>Comanda</strong> · Pedimos juntos, pagamos claro.</p>
  <p>
    Hecho por
    <a href="https://github.com/julitaiter" target="_blank" rel="noopener noreferrer">
      Julián Taiter
    </a>
    ·
    <a
      class="footer-link github-link"
      href="https://github.com/julitaiter/comanda"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ver código de Comanda en GitHub"
    >
      <svg class="github-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 0.5C5.65 0.5 0.5 5.65 0.5 12c0 5.1 3.29 9.41 7.86 10.94.58.1.79-.25.79-.56v-2.02c-3.2.7-3.87-1.37-3.87-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .98-.31 3.19 1.18.93-.26 1.92-.39 2.91-.39.99 0 1.98.13 2.91.39 2.21-1.49 3.18-1.18 3.18-1.18.64 1.58.24 2.75.12 3.04.74.8 1.19 1.82 1.19 3.08 0 4.42-2.69 5.38-5.25 5.67.42.36.78 1.07.78 2.16v3.2c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
        />
      </svg>
      Ver código
    </a>
  </p>
</footer>
  `;

  bindEvents();
  resetPersonForm();
  render();
}

function setState(nextState) {
  state = nextState;
  saveState(state);
  rerender(state);
  render();
}

function bindEvents() {
  document.querySelector("#saveConfigBtn").addEventListener("click", saveConfig);
  document.querySelector("#orderName").addEventListener("change", saveConfig);
  document.querySelector("#surcharge").addEventListener("change", saveConfig);
  document.querySelector("#discount").addEventListener("change", saveConfig);
  document.querySelector("#adjustmentMode").addEventListener("change", saveConfig);

  document.querySelector("#addItemBtn").addEventListener("click", () => addItemRow());
  document.querySelector("#savePersonBtn").addEventListener("click", savePerson);

  document.querySelector("#closeBtn").addEventListener("click", closeOrder);
  document.querySelector("#reopenBtn").addEventListener("click", reopenOrder);

  document.querySelector("#copyFullBtn").addEventListener("click", () => copyText(generateFullSummaryText(state), "Resumen copiado"));
  document.querySelector("#copyStoreBtn").addEventListener("click", () => copyText(generateStoreText(state), "Pedido para el local copiado"));
  document.querySelector("#copyDebtsBtn").addEventListener("click", () => copyText(generateDebtsText(state), "Deudas copiadas"));
  document.querySelector("#whatsappBtn").addEventListener("click", shareWhatsApp);
  document.querySelector("#printBtn").addEventListener("click", () => window.print());

  document.querySelector("#exportBtn").addEventListener("click", () => exportState(state));
  document.querySelector("#importBtn").addEventListener("click", () => document.querySelector("#importFile").click());
  document.querySelector("#importFile").addEventListener("change", importFile);
  document.querySelector("#resetBtn").addEventListener("click", resetAll);
}

function saveConfig() {
  state.name = document.querySelector("#orderName").value.trim() || "Comanda";
  state.adjustments = {
    surcharge: Math.max(0, Number(document.querySelector("#surcharge").value || 0)),
    discount: Math.max(0, Number(document.querySelector("#discount").value || 0)),
    mode: document.querySelector("#adjustmentMode").value === "equal" ? "equal" : "proportional"
  };

  setState(state);
  showToast("Configuración guardada");
}

function addItemRow(item = {}) {
  const row = el("div", { class: "item-row" });
  row.innerHTML = `
    <div class="field" style="margin-bottom:0">
      <label>Producto</label>
      <input class="product-input" list="productSuggestions" type="text" placeholder="Ej: Empanada" value="${item.product || ""}">
    </div>
    <div class="field" style="margin-bottom:0">
      <label>Opción / variedad</label>
      <input class="option-input" list="optionSuggestions" type="text" placeholder="Ej: Jamón y queso" value="${item.option || ""}">
    </div>
    <div class="field" style="margin-bottom:0">
      <label>Cantidad</label>
      <input class="quantity-input" type="number" min="0.01" step="1" placeholder="3" value="${item.quantity || 1}">
    </div>
    <div class="field" style="margin-bottom:0">
      <label>Unidad</label>
      <input class="unit-input" list="unitSuggestions" type="text" placeholder="unidad" value="${item.unit || "unidad"}">
    </div>
    <div class="field" style="margin-bottom:0">
      <label>Precio unit.</label>
      <input class="price-input" type="number" min="0" step="1" placeholder="1200" value="${item.price || 0}">
    </div>
    <button type="button" class="danger icon remove-item" title="Quitar">×</button>
  `;

  const productInput = row.querySelector(".product-input");
  productInput.addEventListener("change", () => applyProductDefaults(row));
  productInput.addEventListener("input", () => renderDatalists(productInput.value));

  row.querySelector(".remove-item").addEventListener("click", () => {
    row.remove();
    if (!document.querySelector("#itemsContainer").children.length) addItemRow();
  });

  document.querySelector("#itemsContainer").appendChild(row);
  renderDatalists();
}

function applyProductDefaults(row) {
  const productName = row.querySelector(".product-input").value.trim();
  const product = getProductByName(state, productName);

  if (!product) return;

  const unitInput = row.querySelector(".unit-input");
  const priceInput = row.querySelector(".price-input");
  const quantityInput = row.querySelector(".quantity-input");

  if (!unitInput.value || unitInput.value === "unidad") unitInput.value = product.unit || "unidad";
  if (!Number(priceInput.value || 0) && Number(product.basePrice || 0)) priceInput.value = product.basePrice;
  quantityInput.step = product.allowDecimals ? "0.01" : "1";

  renderDatalists(productName);
}

function readCurrentItems() {
  return [...document.querySelectorAll(".item-row")]
    .map(row => {
      const product = row.querySelector(".product-input").value.trim();
      const productKey = normalizeProduct(product);
      const option = row.querySelector(".option-input").value.trim();
      const optionKey = normalizeOption(option, productKey);
      const quantity = Number(row.querySelector(".quantity-input").value || 0);
      const unit = row.querySelector(".unit-input").value.trim() || "unidad";
      const price = Number(row.querySelector(".price-input").value || 0);

      return {
        product: product || prettyName(productKey),
        productKey,
        option: option || prettyName(optionKey),
        optionKey,
        quantity,
        unit,
        price
      };
    })
    .filter(item => item.productKey && item.optionKey && item.quantity > 0);
}

function savePerson() {
  if (state.closed) {
    showToast("La comanda está cerrada. Reabrila para editar.");
    return;
  }

  const name = document.querySelector("#personName").value.trim();
  const items = readCurrentItems();

  if (!name) {
    showToast("Falta el nombre de la persona");
    document.querySelector("#personName").focus();
    return;
  }

  if (!items.length) {
    showToast("Cargá al menos un producto");
    return;
  }

  items.forEach(item => registerItemInCatalog(state, item));

  state.people.push({
    id: crypto.randomUUID(),
    name,
    paid: false,
    items
  });

  setState(state);
  resetPersonForm();
  showToast("Persona agregada");
}

function resetPersonForm() {
  document.querySelector("#personName").value = "";
  document.querySelector("#itemsContainer").innerHTML = "";
  addItemRow({ product: "Empanada", unit: "unidad", price: 1200 });
}

function closeOrder() {
  if (!state.people.length) {
    showToast("No hay pedidos cargados");
    return;
  }

  state.closed = true;
  setState(state);
  showToast("Comanda cerrada");
}

function reopenOrder() {
  state.closed = false;
  setState(state);
  showToast("Comanda reabierta");
}

function resetAll() {
  const ok = confirm("Esto borra la comanda cargada en este navegador. Continuar?");
  if (!ok) return;

  setState(resetState());
  resetPersonForm();
  showToast("Comanda reseteada");
}

async function importFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const nextState = await importStateFromFile(file);
    setState(nextState);
    showToast("Pedido importado");
  } catch (error) {
    showToast(error.message || "No se pudo importar el archivo");
  } finally {
    event.target.value = "";
  }
}

function shareWhatsApp() {
  const text = generateFullSummaryText(state);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function render() {
  const totals = calculateTotals(state);

  document.querySelector("#orderName").value = state.name || "Comanda";
  document.querySelector("#surcharge").value = state.adjustments?.surcharge || 0;
  document.querySelector("#discount").value = state.adjustments?.discount || 0;
  document.querySelector("#adjustmentMode").value = state.adjustments?.mode === "equal" ? "equal" : "proportional";

  document.querySelector("#heroTotal").textContent = money(totals.total);
  document.querySelector("#heroQuantity").textContent = getTotalUnitsText(totals);
  document.querySelector("#heroStatus").textContent = state.closed ? "Cerrado" : "Abierto";
  document.querySelector("#heroPeople").textContent = state.people.length === 1
    ? "1 persona cargada"
    : `${state.people.length} personas cargadas`;

  const pill = document.querySelector("#statusPill");
  pill.textContent = state.closed ? "Cerrado" : "Abierto";
  pill.className = state.closed ? "status closed" : "status";

  document.querySelector("#loadPanel").classList.toggle("readonly-overlay", state.closed);
  document.querySelector("#closeBtn").disabled = state.closed || !state.people.length;
  document.querySelector("#reopenBtn").disabled = !state.closed;

  renderDatalists();
  renderStoreSummary(totals);
  renderPeopleSummary(totals);

  const adjustmentText = totals.adjustmentTotal !== 0
    ? ` · Ajuste ${totals.adjustmentTotal >= 0 ? "+" : ""}${money(totals.adjustmentTotal)} (${adjustmentModeLabel(totals.adjustmentMode)})`
    : "";

  document.querySelector("#generalTotal").textContent =
    `${money(totals.total)}${adjustmentText} · Pendiente ${money(totals.totalPending)}`;

  document.querySelector("#shareText").value = generateFullSummaryText(state);
}

function renderDatalists(productName = "") {
  document.querySelector("#productSuggestions").innerHTML = getProductSuggestions(state)
    .map(product => `<option value="${product}">`)
    .join("");

  const selectedProduct = productName || document.querySelector(".product-input")?.value || "Empanada";

  document.querySelector("#optionSuggestions").innerHTML = getOptionSuggestions(state, selectedProduct)
    .map(option => `<option value="${option}">`)
    .join("");

  document.querySelector("#unitSuggestions").innerHTML = getUnitSuggestions(state, selectedProduct)
    .map(unit => `<option value="${unit}">`)
    .join("");
}

function renderStoreSummary(totals) {
  const box = document.querySelector("#storeSummary");
  box.innerHTML = "";

  if (!totals.productGroups.length) {
    box.innerHTML = `<div class="empty">Todavía no hay pedidos cargados.</div>`;
    return;
  }

  totals.productGroups.forEach(group => {
    const wrapper = el("div", { class: "summary-group" });
    wrapper.appendChild(el("div", { class: "summary-title" }, [group.product]));

    group.items.forEach(item => {
      wrapper.appendChild(el("div", { class: "summary-line" }, [
        el("span", {}, [item.option]),
        el("strong", {}, [pluralizeUnit(item.quantity, item.unit)])
      ]));
    });

    box.appendChild(wrapper);
  });
}

function renderPeopleSummary(totals) {
  const box = document.querySelector("#peopleSummary");
  box.innerHTML = "";

  if (!totals.people.length) {
    box.innerHTML = `<div class="empty">Agregá una persona para ver el detalle.</div>`;
    return;
  }

  totals.people.forEach((person, index) => {
    const card = el("div", { class: "person-card" });

    const items = person.items.map(item => `
      <li>
        <span>${item.product} / ${item.option}</span>
        <strong>${formatQuantity(item.quantity)} · ${money(Number(item.quantity) * Number(item.price))}</strong>
      </li>
    `).join("");

    const adjustment = person.adjustment ? `
      <li>
        <span>Ajuste ${adjustmentModeLabel(totals.adjustmentMode)}</span>
        <strong>${person.adjustment >= 0 ? "+" : ""}${money(person.adjustment)}</strong>
      </li>
    ` : "";

    card.innerHTML = `
      <div class="person-head">
        <div>
          <div class="person-name">${person.name}</div>
          <div class="person-total">${money(person.total)}</div>
          <div class="${person.paid ? "paid-badge" : "unpaid-badge"}">${person.paid ? "✓ Pagado" : "Pendiente"}</div>
        </div>
        <div class="compact-actions">
          <button class="${person.paid ? "ghost" : "green"} mark-paid">
            ${person.paid ? "Marcar pendiente" : "Marcar pagado"}
          </button>
          <button class="ghost icon remove-person" title="Eliminar persona">×</button>
        </div>
      </div>
      <ul class="mini-list">${items}${adjustment}</ul>
    `;

    card.querySelector(".mark-paid").addEventListener("click", () => {
      state.people[index].paid = !state.people[index].paid;
      setState(state);
      showToast(state.people[index].paid ? "Marcado como pagado" : "Marcado como pendiente");
    });

    card.querySelector(".remove-person").addEventListener("click", () => {
      if (state.closed) {
        showToast("Reabrí el pedido para eliminar personas");
        return;
      }

      state.people.splice(index, 1);
      setState(state);
      showToast("Persona eliminada");
    });

    box.appendChild(card);
  });
}
