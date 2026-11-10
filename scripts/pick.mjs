const best = m => Math.max(...m.modes.map(x => x.aa));
/** The n strongest closed and n strongest open-weight models by their best mode ("pending" models are never shown). */
export function pick(models, n = 10) {
  const top = type => models.filter(m => m.type === type && m.modes.length)
    .sort((a, b) => best(b) - best(a)).slice(0, n);
  return [...top("closed"), ...top("open")];
}
