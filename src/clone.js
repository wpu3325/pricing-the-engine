// Deep copy for plain JSON-like deal objects (structuredClone is available in all target browsers).
export const clone = (o) => structuredClone(o);
