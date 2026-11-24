// Yatay kart şeridinde seçili kartı şeridin ortasına getirir. Yalnızca şerit kayar (scrollIntoView sayfayı da dikey kaydırabilirdi).
export function centerCard(root: Element | null | undefined, smooth: boolean) {
  const card = root?.querySelector('.mpb-card.on') as HTMLElement | null;
  const track = card?.closest('.mpb-track') as HTMLElement | null;
  if (!card || !track) return;
  const c = card.getBoundingClientRect(), t = track.getBoundingClientRect();
  const left = track.scrollLeft + (c.left - t.left) - (track.clientWidth - c.width) / 2;
  track.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' });
}
