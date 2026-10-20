// Dot-path get/set for deal objects. Numeric segments index arrays.
const idx = (k) => (/^\d+$/.test(k) ? Number(k) : k);

export function getPathOn(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[idx(k)]), obj);
}

export function setPathOn(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[idx(keys[i])];
  cur[idx(keys[keys.length - 1])] = value;
  return obj;
}
