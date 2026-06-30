export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") node.className = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value);
  });

  children.forEach(child => {
    if (child === null || child === undefined) return;
    if (typeof child === "string") node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  });

  return node;
}

export function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

export async function copyText(text, okMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(okMessage);
  } catch {
    const textarea = document.querySelector("#shareText");
    textarea.value = text;
    textarea.focus();
    textarea.select();
    showToast("Copialo manualmente desde el cuadro");
  }
}
