export function normalizeText(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/.,-]/g, " ")
    .replace(/[.,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const productAliases = {
  empanadas: "empanada",
  empanada: "empanada",
  pizza: "pizza",
  pizzas: "pizza",
  gaseosa: "gaseosa",
  gaseosas: "gaseosa",
  bebida: "bebida",
  bebidas: "bebida",
  sanguche: "sanguche",
  sanguches: "sanguche",
  sandwich: "sanguche",
  sandwiches: "sanguche",
  helado: "helado",
  helados: "helado"
};

const optionAliasesByProduct = {
  empanada: {
    jyq: "jamon y queso",
    "j y q": "jamon y queso",
    "j/q": "jamon y queso",
    "jamon queso": "jamon y queso",
    "jamon y queso": "jamon y queso",
    "carne suave": "carne",
    "carne comun": "carne",
    cc: "carne cortada a cuchillo",
    "cortada a cuchillo": "carne cortada a cuchillo",
    "carne cuchillo": "carne cortada a cuchillo",
    verdura: "acelga"
  },
  gaseosa: {
    "coca cola": "coca",
    "coca cola 1 5": "coca 1 5l",
    "coca 1 5": "coca 1 5l",
    "sprite 1 5": "sprite 1 5l"
  }
};

export function normalizeProduct(text) {
  const value = normalizeText(text);
  return productAliases[value] || value;
}

export function normalizeOption(text, productKey = "") {
  const value = normalizeText(text);
  const aliases = optionAliasesByProduct[productKey] || {};
  return aliases[value] || value;
}

export function prettyName(text) {
  return String(text || "")
    .split(" ")
    .filter(Boolean)
    .map(part => {
      if (/^\d/.test(part)) return part;
      if (part.toLowerCase() === "l") return "L";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function formatQuantity(value) {
  const number = Number(value || 0);
  if (Number.isInteger(number)) return String(number);
  return number.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export function pluralizeUnit(quantity, unit) {
  const qty = formatQuantity(quantity);
  const cleanUnit = String(unit || "unidad").trim();
  if (Number(quantity) === 1) return `${qty} ${cleanUnit}`;

  const irregular = {
    unidad: "unidades",
    botella: "botellas",
    lata: "latas",
    pizza: "pizzas",
    porcion: "porciones",
    "porción": "porciones",
    empanada: "empanadas",
    sanguche: "sanguches",
    sandwich: "sandwiches",
    kilo: "kilos",
    kg: "kg"
  };

  return `${qty} ${irregular[cleanUnit.toLowerCase()] || `${cleanUnit}s`}`;
}
