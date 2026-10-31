const handledCommandPaletteEscapes = new WeakSet<Event>();

export function markCommandPaletteEscape(event: Event): void {
  handledCommandPaletteEscapes.add(event);
}

export function wasCommandPaletteEscapeHandled(event: Event): boolean {
  return handledCommandPaletteEscapes.has(event);
}
