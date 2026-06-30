import { normalizeProduct, normalizeOption, prettyName } from "./normalize.js";

export const DEFAULT_PRODUCTS = [
  {
    name: "Empanada",
    key: "empanada",
    unit: "unidad",
    unitOptions: ["unidad"],
    basePrice: 1200,
    allowDecimals: false,
    options: ["Jamón y queso", "Carne", "Carne cortada a cuchillo", "Pollo", "Humita", "Acelga", "Roquefort", "Caprese", "Cebolla y queso", "Calabaza"]
  },
  {
    name: "Pizza",
    key: "pizza",
    unit: "pizza",
    unitOptions: ["pizza", "porción", "unidad"],
    basePrice: 9000,
    allowDecimals: true,
    options: ["Muzzarella", "Napolitana", "Fugazzeta", "Especial", "Jamón y morrón"]
  },
  {
    name: "Gaseosa",
    key: "gaseosa",
    unit: "botella",
    unitOptions: ["botella", "lata", "unidad"],
    basePrice: 0,
    allowDecimals: false,
    options: ["Coca 1.5L", "Sprite 1.5L", "Agua", "Soda"]
  },
  {
    name: "Sanguche",
    key: "sanguche",
    unit: "unidad",
    unitOptions: ["unidad"],
    basePrice: 4500,
    allowDecimals: false,
    options: ["Milanesa", "Milanesa completo", "Jamón y queso", "Vegetariano"]
  }
];

export function getAllProducts(state) {
  const map = new Map();

  DEFAULT_PRODUCTS.forEach(product => {
    map.set(product.key, structuredClone(product));
  });

  (state.catalog?.products || []).forEach(product => {
    const key = product.key || normalizeProduct(product.name);
    const current = map.get(key);

    if (current) {
      const options = new Set([...(current.options || []), ...(product.options || [])]);
      const unitOptions = new Set([...(current.unitOptions || []), ...(product.unitOptions || [])]);
      map.set(key, { ...current, ...product, key, options: [...options], unitOptions: [...unitOptions] });
    } else {
      map.set(key, { ...product, key });
    }
  });

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getProductByName(state, productName) {
  const key = normalizeProduct(productName);
  return getAllProducts(state).find(product => product.key === key);
}

export function getProductSuggestions(state) {
  return getAllProducts(state).map(product => product.name);
}

export function getOptionSuggestions(state, productName) {
  const product = getProductByName(state, productName);
  if (!product) return [];
  return [...new Set(product.options || [])].sort((a, b) => a.localeCompare(b));
}

export function getUnitSuggestions(state, productName) {
  const product = getProductByName(state, productName);
  if (!product) return ["unidad"];
  return [...new Set(product.unitOptions || [product.unit || "unidad"])].sort((a, b) => a.localeCompare(b));
}

export function registerItemInCatalog(state, item) {
  const productKey = item.productKey || normalizeProduct(item.product);
  const optionKey = item.optionKey || normalizeOption(item.option, productKey);
  if (!productKey) return;

  if (!state.catalog) state.catalog = { products: [] };
  if (!Array.isArray(state.catalog.products)) state.catalog.products = [];

  let product = state.catalog.products.find(p => (p.key || normalizeProduct(p.name)) === productKey);

  if (!product) {
    product = {
      key: productKey,
      name: item.product || prettyName(productKey),
      unit: item.unit || "unidad",
      unitOptions: [item.unit || "unidad"],
      basePrice: Number(item.price || 0),
      allowDecimals: Number(item.quantity || 0) % 1 !== 0,
      options: []
    };
    state.catalog.products.push(product);
  }

  product.unit = item.unit || product.unit || "unidad";

  if (!Array.isArray(product.unitOptions)) {
    product.unitOptions = product.unit ? [product.unit] : ["unidad"];
  }

  if (item.unit && !product.unitOptions.includes(item.unit)) {
    product.unitOptions.push(item.unit);
  }

  if (Number(item.price || 0) > 0 && !Number(product.basePrice || 0)) {
    product.basePrice = Number(item.price);
  }

  if (Number(item.quantity || 0) % 1 !== 0) {
    product.allowDecimals = true;
  }

  const alreadyExists = (product.options || [])
    .some(option => normalizeOption(option, productKey) === optionKey);

  if (item.option && optionKey && !alreadyExists) {
    product.options = [...(product.options || []), item.option || prettyName(optionKey)];
  }
}
