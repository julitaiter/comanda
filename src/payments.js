export const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Mercado Pago", "Otro"];

export const PAYMENT_TOLERANCE = 0.01;

function toAmount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  return Math.round(toAmount(value) * 100) / 100;
}

function getPeopleMap(state) {
  return new Map((state.people || []).map(person => [person.id, person]));
}

export function validatePayment(payment) {
  if (!payment?.payerId) {
    return { valid: false, message: "Elegí quién pagó." };
  }

  const amount = toAmount(payment.amount);
  if (amount <= 0) {
    return { valid: false, message: "El monto pagado debe ser mayor a cero." };
  }

  const allocations = (payment.allocations || [])
    .filter(allocation => allocation?.personId && toAmount(allocation.amount) > 0);

  if (!allocations.length) {
    return { valid: false, message: "Aplicá el pago a al menos una persona." };
  }

  const applied = allocations.reduce((sum, allocation) => sum + toAmount(allocation.amount), 0);
  if (applied <= 0) {
    return { valid: false, message: "La suma aplicada debe ser mayor a cero." };
  }

  if (Math.abs(roundMoney(applied) - roundMoney(amount)) > PAYMENT_TOLERANCE) {
    return { valid: false, message: "La suma aplicada debe coincidir con el monto pagado." };
  }

  return { valid: true, message: "" };
}

export function normalizePayment(payment) {
  return {
    id: payment?.id || crypto.randomUUID(),
    payerId: payment?.payerId || "",
    amount: roundMoney(payment?.amount),
    method: PAYMENT_METHODS.includes(payment?.method) ? payment.method : PAYMENT_METHODS[0],
    note: String(payment?.note || "").trim(),
    date: payment?.date || new Date().toISOString(),
    allocations: (payment?.allocations || [])
      .filter(allocation => allocation?.personId && toAmount(allocation.amount) > 0)
      .map(allocation => ({
        personId: allocation.personId,
        amount: roundMoney(allocation.amount)
      }))
  };
}

export function getPaymentsByPerson(state) {
  const peopleMap = getPeopleMap(state);
  const result = new Map((state.people || []).map(person => [
    person.id,
    {
      personId: person.id,
      totalCovered: 0,
      payments: [],
      paidBy: []
    }
  ]));

  (state.payments || []).forEach(payment => {
    const payer = peopleMap.get(payment.payerId);

    (payment.allocations || []).forEach(allocation => {
      if (!allocation?.personId) return;

      const amount = toAmount(allocation.amount);
      if (amount <= 0) return;

      if (!result.has(allocation.personId)) {
        result.set(allocation.personId, {
          personId: allocation.personId,
          totalCovered: 0,
          payments: [],
          paidBy: []
        });
      }

      const entry = result.get(allocation.personId);
      const detail = {
        paymentId: payment.id,
        payerId: payment.payerId,
        payerName: payer?.name || "Sin nombre",
        amount,
        method: payment.method,
        date: payment.date,
        note: payment.note || ""
      };

      entry.totalCovered += amount;
      entry.payments.push(detail);
      entry.paidBy.push(detail);
    });
  });

  result.forEach(entry => {
    entry.totalCovered = roundMoney(entry.totalCovered);
  });

  return result;
}

export function getPaymentsByPayer(state) {
  const peopleMap = getPeopleMap(state);
  const result = new Map((state.people || []).map(person => [
    person.id,
    {
      payerId: person.id,
      payerName: person.name,
      totalPaid: 0,
      appliedTo: []
    }
  ]));

  (state.payments || []).forEach(payment => {
    if (!result.has(payment.payerId)) {
      result.set(payment.payerId, {
        payerId: payment.payerId,
        payerName: peopleMap.get(payment.payerId)?.name || "Sin nombre",
        totalPaid: 0,
        appliedTo: []
      });
    }

    const entry = result.get(payment.payerId);
    entry.totalPaid += toAmount(payment.amount);

    (payment.allocations || []).forEach(allocation => {
      const person = peopleMap.get(allocation.personId);
      entry.appliedTo.push({
        paymentId: payment.id,
        personId: allocation.personId,
        personName: person?.name || "Sin nombre",
        amount: toAmount(allocation.amount),
        method: payment.method,
        date: payment.date,
        note: payment.note || ""
      });
    });
  });

  result.forEach(entry => {
    entry.totalPaid = roundMoney(entry.totalPaid);
  });

  return result;
}

export function getInternalDebts(state) {
  const peopleMap = getPeopleMap(state);
  const debts = new Map();

  (state.payments || []).forEach(payment => {
    const payerId = payment.payerId;
    if (!payerId) return;

    (payment.allocations || []).forEach(allocation => {
      const debtorId = allocation.personId;
      const amount = toAmount(allocation.amount);

      if (!debtorId || debtorId === payerId || amount <= 0) return;

      const key = `${debtorId}::${payerId}`;
      const current = debts.get(key) || {
        debtorId,
        debtorName: peopleMap.get(debtorId)?.name || "Sin nombre",
        creditorId: payerId,
        creditorName: peopleMap.get(payerId)?.name || "Sin nombre",
        amount: 0
      };

      current.amount += amount;
      debts.set(key, current);
    });
  });

  return [...debts.values()]
    .map(debt => ({
      ...debt,
      amount: roundMoney(debt.amount)
    }))
    .filter(debt => debt.amount > PAYMENT_TOLERANCE)
    .sort((a, b) => a.debtorName.localeCompare(b.debtorName) || a.creditorName.localeCompare(b.creditorName));
}

export function getPaymentStatus(total, covered) {
  const debt = toAmount(total);
  const paid = toAmount(covered);

  if (paid <= PAYMENT_TOLERANCE) return "pending";
  if (paid - debt > PAYMENT_TOLERANCE) return "overpaid";
  if (Math.abs(debt - paid) <= PAYMENT_TOLERANCE) return "paid";
  return "partial";
}

export function getPaymentStatusLabel(status) {
  const labels = {
    pending: "Pendiente",
    partial: "Pago parcial",
    paid: "Pagado",
    overpaid: "Pago de mas"
  };

  return labels[status] || labels.pending;
}
