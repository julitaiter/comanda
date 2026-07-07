import { pluralizeUnit } from "./normalize.js";
import { getInternalDebts, getPaymentStatus, getPaymentsByPayer, getPaymentsByPerson } from "./payments.js";

export function getAdjustmentTotal(state) {
  const surcharge = Number(state.adjustments?.surcharge || 0);
  const discount = Number(state.adjustments?.discount || 0);
  return surcharge - discount;
}

export function getAdjustmentMode(state) {
  return state.adjustments?.mode === "equal" ? "equal" : "proportional";
}

export function calculatePersonAdjustment(personSubtotal, generalSubtotal, state, peopleCount = 0) {
  const adjustment = getAdjustmentTotal(state);
  if (!adjustment) return 0;

  const mode = getAdjustmentMode(state);

  if (mode === "equal") {
    if (!peopleCount) return 0;
    return adjustment / peopleCount;
  }

  if (!generalSubtotal) return 0;
  return adjustment * (personSubtotal / generalSubtotal);
}

export function calculateTotals(state) {
  const grouped = {};
  const peopleBase = [];
  let generalQuantity = 0;
  let generalSubtotal = 0;

  (state.people || []).forEach(person => {
    let personQuantity = 0;
    let personSubtotal = 0;

    (person.items || []).forEach(item => {
      const productKey = item.productKey;
      const optionKey = item.optionKey;
      const unit = item.unit || "unidad";
      const groupKey = `${productKey}::${optionKey}::${unit}`;
      const subtotal = Number(item.quantity) * Number(item.price);

      if (!grouped[productKey]) {
        grouped[productKey] = {
          productKey,
          product: item.product,
          groups: {}
        };
      }

      if (!grouped[productKey].groups[groupKey]) {
        grouped[productKey].groups[groupKey] = {
          productKey,
          optionKey,
          product: item.product,
          option: item.option,
          unit,
          quantity: 0,
          total: 0
        };
      }

      grouped[productKey].groups[groupKey].quantity += Number(item.quantity);
      grouped[productKey].groups[groupKey].total += subtotal;

      personQuantity += Number(item.quantity);
      personSubtotal += subtotal;
      generalQuantity += Number(item.quantity);
      generalSubtotal += subtotal;
    });

    peopleBase.push({
      ...person,
      quantity: personQuantity,
      subtotal: personSubtotal
    });
  });

  const productGroups = Object.values(grouped)
    .map(productGroup => ({
      ...productGroup,
      items: Object.values(productGroup.groups).sort((a, b) => a.option.localeCompare(b.option))
    }))
    .sort((a, b) => a.product.localeCompare(b.product));

  const adjustmentTotal = getAdjustmentTotal(state);
  const adjustmentMode = getAdjustmentMode(state);
  const total = generalSubtotal + adjustmentTotal;
  const peopleCount = peopleBase.length;
  const paymentsByPerson = getPaymentsByPerson(state);
  const paymentsByPayer = getPaymentsByPayer(state);
  const internalDebts = getInternalDebts(state);

  const people = peopleBase.map(person => {
    const adjustment = calculatePersonAdjustment(person.subtotal, generalSubtotal, state, peopleCount);
    const personTotal = person.subtotal + adjustment;
    const paymentInfo = paymentsByPerson.get(person.id) || { totalCovered: 0, paidBy: [] };
    const covered = Number(paymentInfo.totalCovered || 0);
    const pending = Math.max(personTotal - covered, 0);
    const overpaid = Math.max(covered - personTotal, 0);

    return {
      ...person,
      adjustment,
      total: personTotal,
      covered,
      pending,
      overpaid,
      paymentStatus: getPaymentStatus(personTotal, covered),
      paidBy: paymentInfo.paidBy || []
    };
  });

  const totalReceived = (state.payments || [])
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalPaid = people
    .reduce((sum, person) => sum + Math.min(Number(person.covered || 0), Number(person.total || 0)), 0);
  const totalPending = people
    .reduce((sum, person) => sum + Number(person.pending || 0), 0);
  const totalOverpaid = people
    .reduce((sum, person) => sum + Number(person.overpaid || 0), 0);

  return {
    productGroups,
    people,
    generalQuantity,
    generalSubtotal,
    adjustmentTotal,
    adjustmentMode,
    total,
    totalReceived,
    totalPaid,
    totalPending,
    totalOverpaid,
    paymentsByPayer,
    internalDebts
  };
}

export function getTotalUnitsText(totals) {
  const byUnit = new Map();

  totals.productGroups.forEach(group => {
    group.items.forEach(item => {
      byUnit.set(item.unit, (byUnit.get(item.unit) || 0) + Number(item.quantity));
    });
  });

  if (!byUnit.size) return "0 unidades";

  return [...byUnit.entries()]
    .map(([unit, quantity]) => pluralizeUnit(quantity, unit))
    .join(" · ");
}
