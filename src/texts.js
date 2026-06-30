import { calculateTotals, getTotalUnitsText } from "./totals.js";
import { formatQuantity, money, pluralizeUnit } from "./normalize.js";

export function adjustmentModeLabel(mode) {
  return mode === "equal" ? "partes iguales" : "proporcional";
}

export function generateStoreText(state) {
  const totals = calculateTotals(state);
  const lines = [];

  lines.push(`🧾 ${state.name || "Comanda"}`);
  lines.push("");
  lines.push("Pedido para el local:");

  if (!totals.productGroups.length) {
    lines.push("- Sin pedidos cargados");
  } else {
    totals.productGroups.forEach(group => {
      lines.push("");
      lines.push(`${group.product}:`);
      group.items.forEach(item => {
        lines.push(`- ${item.option}: ${pluralizeUnit(item.quantity, item.unit)}`);
      });
    });
  }

  lines.push("");
  lines.push(`Total: ${getTotalUnitsText(totals)}`);

  return lines.join("\n");
}

export function generateDebtsText(state) {
  const totals = calculateTotals(state);
  const lines = [];

  lines.push(`💸 ${state.name || "Comanda"}`);
  lines.push("");
  lines.push("Deudas por persona:");

  if (!totals.people.length) {
    lines.push("- Sin personas cargadas");
  } else {
    totals.people.forEach(person => {
      const paymentStatus = person.paid ? "PAGADO" : "PENDIENTE";
      lines.push(`- ${person.name}: ${money(person.total)} - ${paymentStatus}`);
    });
  }

  if (totals.adjustmentTotal !== 0) {
    lines.push("");
    if (Number(state.adjustments?.surcharge || 0) > 0) {
      lines.push(`Recargo/envío: ${money(state.adjustments.surcharge)}`);
    }
    if (Number(state.adjustments?.discount || 0) > 0) {
      lines.push(`Descuento: -${money(state.adjustments.discount)}`);
    }
    lines.push(`División del ajuste: ${adjustmentModeLabel(totals.adjustmentMode)}`);
  }

  lines.push("");
  lines.push(`Total pagado: ${money(totals.totalPaid)}`);
  lines.push(`Total pendiente: ${money(totals.totalPending)}`);
  lines.push(`Total general: ${money(totals.total)}`);

  return lines.join("\n");
}

export function generateFullSummaryText(state) {
  const totals = calculateTotals(state);
  const lines = [];

  lines.push(generateStoreText(state));
  lines.push("");
  lines.push("Detalle por persona:");

  if (!totals.people.length) {
    lines.push("- Sin personas cargadas");
  } else {
    totals.people.forEach(person => {
      lines.push("");
      lines.push(`${person.name}:`);
      person.items.forEach(item => {
        lines.push(`- ${item.product} / ${item.option}: ${formatQuantity(item.quantity)} x ${money(item.price)} = ${money(Number(item.quantity) * Number(item.price))}`);
      });

      if (person.adjustment) {
        lines.push(`Ajuste ${adjustmentModeLabel(totals.adjustmentMode)}: ${person.adjustment >= 0 ? "+" : ""}${money(person.adjustment)}`);
      }

      lines.push(`Total: ${money(person.total)} - ${person.paid ? "PAGADO" : "PENDIENTE"}`);
    });
  }

  if (totals.adjustmentTotal !== 0) {
    lines.push("");
    if (Number(state.adjustments?.surcharge || 0) > 0) {
      lines.push(`Recargo/envío: ${money(state.adjustments.surcharge)}`);
    }
    if (Number(state.adjustments?.discount || 0) > 0) {
      lines.push(`Descuento: -${money(state.adjustments.discount)}`);
    }
    lines.push(`División del ajuste: ${adjustmentModeLabel(totals.adjustmentMode)}`);
  }

  lines.push("");
  lines.push(`Total pagado: ${money(totals.totalPaid)}`);
  lines.push(`Total pendiente: ${money(totals.totalPending)}`);
  lines.push(`Total general: ${money(totals.total)}`);

  if (!state.closed) {
    lines.push("");
    lines.push("Estado: comanda abierta");
  }

  return lines.join("\n");
}
