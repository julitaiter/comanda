import { pluralizeUnit } from "./normalize.js";

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

  state.people.forEach(person => {
    let personQuantity = 0;
    let personSubtotal = 0;

    person.items.forEach(item => {
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

  const people = peopleBase.map(person => {
    const adjustment = calculatePersonAdjustment(person.subtotal, generalSubtotal, state, peopleCount);
    return {
      ...person,
      adjustment,
      total: person.subtotal + adjustment
    };
  });

  const totalPaid = people
    .filter(person => person.paid)
    .reduce((sum, person) => sum + person.total, 0);

  const totalPending = people
    .filter(person => !person.paid)
    .reduce((sum, person) => sum + person.total, 0);

  return {
    productGroups,
    people,
    generalQuantity,
    generalSubtotal,
    adjustmentTotal,
    adjustmentMode,
    total,
    totalPaid,
    totalPending
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
