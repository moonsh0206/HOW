export function node(tag, text, className) {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
}
export function image(url, className = '') {
  const img = node('img', undefined, className); img.src = url; img.alt = ''; img.loading = 'lazy';
  img.addEventListener('error', () => img.remove(), { once: true }); return img;
}
