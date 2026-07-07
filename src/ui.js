import { registerItemInCatalog, getOptionSuggestions, getProductByName, getProductSuggestions, getUnitSuggestions } from "./catalog.js";
import { normalizeOption, normalizeProduct, money, pluralizeUnit, formatQuantity, prettyName } from "./normalize.js";
import { calculateTotals, getTotalUnitsText } from "./totals.js";
import { generateDebtsText, generateFullSummaryText, generateStoreText, adjustmentModeLabel } from "./texts.js";
import { copyText, el, showToast } from "./dom.js";
import { exportState, importStateFromFile, resetState, saveState } from "./state.js";
import { PAYMENT_METHODS, getPaymentStatusLabel, validatePayment } from "./payments.js";

let state;
let rerender;
let activeTab = "order";
let editingPersonId = null;

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

      <nav class="tabs" aria-label="Secciones principales">
        <button class="tab-button" type="button" data-tab="order">Pedido</button>
        <button class="tab-button" type="button" data-tab="summary">Resumen</button>
        <button class="tab-button" type="button" data-tab="payments">Pagos</button>
      </nav>

      <main class="layout tabbed-layout">
        <div class="left-col">
          <section class="panel" data-tab-section="order">
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

          <section class="panel" id="loadPanel" data-tab-section="order">
            <div class="panel-header">
              <div>
                <h2 id="personFormTitle">Cargar persona</h2>
                <div class="hint">Cada renglón puede ser un producto distinto: empanadas, pizza, bebida, sanguches, etc.</div>
              </div>
            </div>

            <div id="editingNotice" class="editing-notice"></div>

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
              <button class="ghost" id="cancelEditBtn" type="button">Cancelar edicion</button>
            </div>
          </section>

          <section class="panel" data-tab-section="order">
            <div class="panel-header">
              <div>
                <h2>Personas cargadas</h2>
                <div class="hint">Edita o elimina pedidos ya cargados.</div>
              </div>
            </div>
            <div id="orderPeopleList" class="people-list"></div>
          </section>
        </div>

        <div>
          <section class="panel" data-tab-section="summary">
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

          <section class="panel" data-tab-section="payments">
            <div class="panel-header">
              <div>
                <h2>Pagos</h2>
                <div class="hint">Registrá quién pagó, cuánto pagó y a quién cubrió.</div>
              </div>
            </div>

            <div id="paymentTotals" class="payment-totals"></div>
            <div id="paymentForm" class="payment-form"></div>

            <h3>Deudas entre personas</h3>
            <div id="internalDebtsList" class="internal-debts-list"></div>

            <h3>Pagos registrados</h3>
            <div id="paymentsList" class="payments-list"></div>
          </section>

          <section class="panel" data-tab-section="summary">
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
  document.querySelector("#cancelEditBtn").addEventListener("click", cancelPersonEdit);

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

  document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });
}

function setActiveTab(tab) {
  activeTab = ["order", "summary", "payments"].includes(tab) ? tab : "order";

  document.querySelectorAll(".tab-button").forEach(button => {
    const isActive = button.dataset.tab === activeTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  document.querySelectorAll("[data-tab-section]").forEach(section => {
    section.classList.toggle("active-tab-section", section.dataset.tabSection === activeTab);
  });
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

  if (editingPersonId) {
    const index = state.people.findIndex(person => person.id === editingPersonId);

    if (index === -1) {
      editingPersonId = null;
      resetPersonForm();
      showToast("No se encontro la persona a editar");
      return;
    }

    state.people[index] = {
      ...state.people[index],
      name,
      items
    };

    editingPersonId = null;
    setState(state);
    resetPersonForm();
    showToast("Pedido actualizado");
    return;
  }

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
  editingPersonId = null;
  document.querySelector("#personName").value = "";
  document.querySelector("#itemsContainer").innerHTML = "";
  addItemRow();
  updatePersonFormMode();
}

function hasPaymentsForPerson(personId) {
  return (state.payments || []).some(payment =>
    payment.payerId === personId || (payment.allocations || []).some(allocation => allocation.personId === personId)
  );
}

function getRelatedPaymentsNotice(personId) {
  if (!hasPaymentsForPerson(personId)) return "";

  return `
    <div class="editing-payment-warning">
      Esta persona tiene pagos registrados o aplicados. Si cambias el pedido, se recalcularan pendientes y saldos, pero los pagos registrados no se modificaran.
    </div>
  `;
}

function updatePersonFormMode() {
  const person = editingPersonId
    ? state.people.find(candidate => candidate.id === editingPersonId)
    : null;
  const title = document.querySelector("#personFormTitle");
  const notice = document.querySelector("#editingNotice");
  const saveButton = document.querySelector("#savePersonBtn");
  const cancelButton = document.querySelector("#cancelEditBtn");

  if (!title || !notice || !saveButton || !cancelButton) return;

  if (!person) {
    title.textContent = "Cargar persona";
    notice.innerHTML = "";
    saveButton.textContent = "Guardar persona";
    cancelButton.hidden = true;
    return;
  }

  title.textContent = "Editar pedido";
  notice.innerHTML = `
    <div class="editing-banner">
      <strong>Editando pedido de ${person.name}</strong>
      ${getRelatedPaymentsNotice(person.id)}
    </div>
  `;
  saveButton.textContent = "Guardar cambios";
  cancelButton.hidden = false;
}

function cancelPersonEdit() {
  resetPersonForm();
  showToast("Edicion cancelada");
}

function startPersonEdit(personId) {
  if (state.closed) {
    showToast("Reabri el pedido para editar personas");
    return;
  }

  const person = state.people.find(candidate => candidate.id === personId);
  if (!person) {
    showToast("No se encontro la persona");
    return;
  }

  editingPersonId = person.id;
  setActiveTab("order");
  document.querySelector("#personName").value = person.name || "";
  document.querySelector("#itemsContainer").innerHTML = "";
  (person.items || []).forEach(item => addItemRow(item));
  if (!document.querySelector("#itemsContainer").children.length) addItemRow();
  updatePersonFormMode();
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
  renderOrderPeopleList(totals);
  renderStoreSummary(totals);
  renderPeopleSummary(totals);
  renderPaymentsSection(totals);
  updatePersonFormMode();

  const adjustmentText = totals.adjustmentTotal !== 0
    ? ` · Ajuste ${totals.adjustmentTotal >= 0 ? "+" : ""}${money(totals.adjustmentTotal)} (${adjustmentModeLabel(totals.adjustmentMode)})`
    : "";

  document.querySelector("#generalTotal").textContent =
    `${money(totals.total)}${adjustmentText} · Pendiente ${money(totals.totalPending)}`;

  document.querySelector("#shareText").value = generateFullSummaryText(state);
  setActiveTab(activeTab);
}

function getPersonName(personId) {
  return state.people.find(person => person.id === personId)?.name || "Sin nombre";
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function readPaymentDraft() {
  const allocations = [...document.querySelectorAll(".allocation-input")]
    .map(input => ({
      personId: input.dataset.personId,
      amount: Number(input.value || 0)
    }))
    .filter(allocation => allocation.personId && allocation.amount > 0);

  return {
    id: crypto.randomUUID(),
    payerId: document.querySelector("#paymentPayer")?.value || "",
    amount: Number(document.querySelector("#paymentAmount")?.value || 0),
    method: document.querySelector("#paymentMethod")?.value || PAYMENT_METHODS[0],
    note: document.querySelector("#paymentNote")?.value.trim() || "",
    date: new Date().toISOString(),
    allocations
  };
}

function updatePaymentAmountFromAllocations() {
  const total = [...document.querySelectorAll(".allocation-input")]
    .reduce((sum, input) => sum + Number(input.value || 0), 0);
  const amountInput = document.querySelector("#paymentAmount");

  if (amountInput) amountInput.value = total ? String(Math.round(total * 100) / 100) : "";
}

function autofillPayerPending(totals = calculateTotals(state)) {
  const payerId = document.querySelector("#paymentPayer")?.value;
  if (!payerId) return;

  document.querySelectorAll(".allocation-input").forEach(input => {
    input.value = "";
  });

  const payerTotal = totals.people.find(person => person.id === payerId);
  const input = document.querySelector(`.allocation-input[data-person-id="${payerId}"]`);
  const pending = Number(payerTotal?.pending || 0);

  if (input && pending > 0) input.value = String(Math.round(pending * 100) / 100);
  updatePaymentAmountFromAllocations();
}

function resetPaymentForm(totals = calculateTotals(state)) {
  document.querySelectorAll(".allocation-input").forEach(input => {
    input.value = "";
  });

  const payer = document.querySelector("#paymentPayer");
  const amount = document.querySelector("#paymentAmount");
  const method = document.querySelector("#paymentMethod");
  const note = document.querySelector("#paymentNote");

  if (payer) payer.value = state.people[0]?.id || "";
  if (amount) amount.value = "";
  if (method) method.value = PAYMENT_METHODS[0];
  if (note) note.value = "";

  autofillPayerPending(totals);
}

function fillAllocationPending(personId, pending) {
  const input = document.querySelector(`.allocation-input[data-person-id="${personId}"]`);
  if (!input) return;

  const amount = Number(pending || 0);
  input.value = amount > 0 ? String(Math.round(amount * 100) / 100) : "";
  updatePaymentAmountFromAllocations();
}

function savePayment() {
  const payment = readPaymentDraft();
  const validation = validatePayment(payment);

  if (!validation.valid) {
    showToast(validation.message);
    return;
  }

  state.payments = [...(state.payments || []), payment];
  setState(state);
  showToast("Pago registrado");
}

function removePayment(paymentId) {
  state.payments = (state.payments || []).filter(payment => payment.id !== paymentId);
  setState(state);
  showToast("Pago eliminado");
}

function renderPaymentsSection(totals) {
  const totalsBox = document.querySelector("#paymentTotals");
  const form = document.querySelector("#paymentForm");
  const list = document.querySelector("#paymentsList");
  const internalDebtsList = document.querySelector("#internalDebtsList");

  totalsBox.innerHTML = `
    <div class="payment-total-card">
      <span>Total comanda</span>
      <strong>${money(totals.total)}</strong>
    </div>
    <div class="payment-total-card">
      <span>Cobrado/aplicado</span>
      <strong>${money(totals.totalPaid)}</strong>
    </div>
    <div class="payment-total-card">
      <span>Pendiente</span>
      <strong>${money(totals.totalPending)}</strong>
    </div>
    <div class="payment-total-card ${totals.totalOverpaid > 0 ? "has-overpay" : ""}">
      <span>Pagos de mas</span>
      <strong>${money(totals.totalOverpaid)}</strong>
    </div>
  `;

  if (!state.people.length) {
    form.innerHTML = `<div class="empty">Agregá personas para registrar pagos.</div>`;
  } else {
    form.innerHTML = `
      <div class="form-grid">
        <div class="field">
          <label for="paymentPayer">Quién pagó</label>
          <select id="paymentPayer">
            ${state.people.map(person => `<option value="${person.id}">${person.name}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="paymentAmount">Monto pagado</label>
          <input id="paymentAmount" type="number" min="0" step="0.01" placeholder="0">
        </div>
        <div class="field">
          <label for="paymentMethod">Medio</label>
          <select id="paymentMethod">
            ${PAYMENT_METHODS.map(method => `<option value="${method}">${method}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="paymentNote">Nota</label>
          <input id="paymentNote" type="text" placeholder="Opcional">
        </div>
      </div>

      <h3>Aplicar pago a</h3>
      <div class="allocations-list">
        ${totals.people.map(person => `
          <div class="allocation-row">
            <div>
              <strong>${person.name}</strong>
              <span>Pendiente ${money(person.pending)}</span>
            </div>
            <input
              class="allocation-input"
              data-person-id="${person.id}"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
            >
            <button class="ghost use-pending" type="button" data-person-id="${person.id}" data-pending="${person.pending}">
              Usar pendiente
            </button>
          </div>
        `).join("")}
      </div>

      <div class="actions">
        <button class="green" id="savePaymentBtn">Registrar pago</button>
      </div>
    `;

    form.querySelector("#paymentPayer").addEventListener("change", () => autofillPayerPending(totals));
    form.querySelectorAll(".allocation-input").forEach(input => {
      input.addEventListener("input", updatePaymentAmountFromAllocations);
    });
    form.querySelectorAll(".use-pending").forEach(button => {
      button.addEventListener("click", () => fillAllocationPending(button.dataset.personId, button.dataset.pending));
    });
    form.querySelector("#savePaymentBtn").addEventListener("click", savePayment);
    resetPaymentForm(totals);
  }

  if (!totals.internalDebts.length) {
    internalDebtsList.innerHTML = `<div class="empty">No hay deudas internas entre personas.</div>`;
  } else {
    internalDebtsList.innerHTML = totals.internalDebts.map(debt => `
      <div class="internal-debt-row">
        <span>${debt.debtorName} le debe <strong>${money(debt.amount)}</strong> a ${debt.creditorName}</span>
      </div>
    `).join("");
  }

  if (!(state.payments || []).length) {
    list.innerHTML = `<div class="empty">Todavía no hay pagos registrados.</div>`;
    return;
  }

  list.innerHTML = (state.payments || []).map(payment => {
    const allocations = (payment.allocations || [])
      .map(allocation => `<li><span>${getPersonName(allocation.personId)}</span><strong>${money(allocation.amount)}</strong></li>`)
      .join("");
    const note = payment.note ? `<div class="payment-note">${payment.note}</div>` : "";

    return `
      <div class="payment-card">
        <div class="payment-card-head">
          <div>
            <div class="payment-title">${getPersonName(payment.payerId)} pagó ${money(payment.amount)}</div>
            <div class="payment-meta">${payment.method || "Efectivo"} · ${formatDateTime(payment.date)}</div>
          </div>
          <button class="danger icon remove-payment" title="Eliminar pago" data-payment-id="${payment.id}">×</button>
        </div>
        <ul class="mini-list">${allocations}</ul>
        ${note}
      </div>
    `;
  }).join("");

  list.querySelectorAll(".remove-payment").forEach(button => {
    button.addEventListener("click", () => removePayment(button.dataset.paymentId));
  });
}

function renderDatalists(productName = "") {
  document.querySelector("#productSuggestions").innerHTML = getProductSuggestions(state)
    .map(product => `<option value="${product}">`)
    .join("");

  const selectedProduct = productName || document.querySelector(".product-input")?.value || "";

  document.querySelector("#optionSuggestions").innerHTML = getOptionSuggestions(state, selectedProduct)
    .map(option => `<option value="${option}">`)
    .join("");

  document.querySelector("#unitSuggestions").innerHTML = getUnitSuggestions(state, selectedProduct)
    .map(unit => `<option value="${unit}">`)
    .join("");
}

function cleanupPaymentsForRemovedPerson(personId) {
  state.payments = (state.payments || [])
    .filter(payment => payment.payerId !== personId)
    .map(payment => {
      const allocations = (payment.allocations || [])
        .filter(allocation => allocation.personId !== personId);
      const amount = allocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);

      return {
        ...payment,
        amount,
        allocations
      };
    })
    .filter(payment => payment.allocations.length && Number(payment.amount || 0) > 0);
}

function removePerson(personId) {
  if (state.closed) {
    showToast("Reabri el pedido para eliminar personas");
    return;
  }

  const person = state.people.find(candidate => candidate.id === personId);
  if (!person) return;

  if (hasPaymentsForPerson(personId)) {
    const ok = confirm("Esta persona tiene pagos registrados o pagos aplicados. Si la eliminas, tambien se eliminaran o afectaran esos registros. Queres continuar?");
    if (!ok) return;
    cleanupPaymentsForRemovedPerson(personId);
  }

  state.people = state.people.filter(candidate => candidate.id !== personId);
  if (editingPersonId === personId) editingPersonId = null;
  setState(state);
  resetPersonForm();
  showToast("Persona eliminada");
}

function renderOrderPeopleList(totals) {
  const box = document.querySelector("#orderPeopleList");
  if (!box) return;

  box.innerHTML = "";

  if (!totals.people.length) {
    box.innerHTML = `<div class="empty">Todavia no hay personas cargadas.</div>`;
    return;
  }

  totals.people.forEach(person => {
    const card = el("div", { class: "person-card order-person-card" });
    const itemCount = (person.items || []).length;

    card.innerHTML = `
      <div class="person-head">
        <div>
          <div class="person-name">${person.name}</div>
          <div class="person-total">${itemCount === 1 ? "1 item" : `${itemCount} items`} · Total: ${money(person.total)}</div>
          <div class="payment-status-badge status-${person.paymentStatus}">${getPaymentStatusLabel(person.paymentStatus)}</div>
        </div>
        <div class="compact-actions">
          <button class="ghost edit-person" type="button">Editar</button>
          <button class="ghost icon remove-person" type="button" title="Eliminar persona">×</button>
        </div>
      </div>
    `;

    card.querySelector(".edit-person").addEventListener("click", () => startPersonEdit(person.id));
    card.querySelector(".remove-person").addEventListener("click", () => removePerson(person.id));
    box.appendChild(card);
  });
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

    const overpaid = person.overpaid > 0 ? `
      <li>
        <span>Pago de mas</span>
        <strong>${money(person.overpaid)}</strong>
      </li>
    ` : "";

    const coveredBy = person.paidBy.length ? `
      <div class="covered-by">
        <strong>Cubierto por:</strong>
        <ul>
          ${person.paidBy.map(payment => `<li>${payment.payerName}: ${money(payment.amount)}</li>`).join("")}
        </ul>
      </div>
    ` : "";

    card.innerHTML = `
      <div class="person-head">
        <div>
          <div class="person-name">${person.name}</div>
          <div class="person-total">Total: ${money(person.total)}</div>
          <div class="payment-status-badge status-${person.paymentStatus}">${getPaymentStatusLabel(person.paymentStatus)}</div>
        </div>
        <div class="compact-actions">
          <button class="ghost edit-person" type="button">Editar</button>
          <button class="ghost icon remove-person" title="Eliminar persona">×</button>
        </div>
      </div>
      <ul class="mini-list">
        ${items}
        ${adjustment}
        <li><span>Cubierto</span><strong>${money(person.covered)}</strong></li>
        <li><span>Pendiente</span><strong>${money(person.pending)}</strong></li>
        ${overpaid}
      </ul>
      ${coveredBy}
    `;

    card.querySelector(".edit-person").addEventListener("click", () => startPersonEdit(person.id));
    card.querySelector(".remove-person").addEventListener("click", () => {
      if (state.closed) {
        showToast("Reabrí el pedido para eliminar personas");
        return;
      }

      removePerson(person.id);
    });

    box.appendChild(card);
  });
}
