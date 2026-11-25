// FIDE chess YouTube kanalının son videolarını public/fide-videos.json dosyasına yazar (src/components/VideoPlaylist.tsx okur).
// YouTube'un RSS akışı tarayıcıdan (CORS) okunamadığı için akış derleme sırasında alınır.
// Akış alınamazsa mevcut dosya olduğu gibi kalır (betik hata vermez).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CHANNEL = 'UC9B47GnzCRFHTT1BIBWvStQ'; // https://www.youtube.com/@FIDE_chess
const OUT = fileURLToPath(new URL('../public/fide-videos.json', import.meta.url));
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

try {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const xml = await r.text();
  const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    id: e.match(/<yt:videoId>([^<]+)/)?.[1],
    title: unesc(e.match(/<title>([^<]*)/)?.[1] ?? ''),
    published: e.match(/<published>([^<]+)/)?.[1],
  })).filter((v) => v.id && v.title && v.published);
  if (!videos.length) throw new Error('akış boş');
  // RSS yalnızca son ~15 videoyu taşır; maç günü kısa videolar canlı yayınları listeden iter. Kanalın "Canlı" sekmesi (/streams) o an canlı olan ve yakın zamanda biten yayınları verir: RSS'te olmayanlar eklenir.
  try {
    const sr = await fetch(`https://www.youtube.com/channel/${CHANNEL}/streams?hl=en`, { signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'en' } });
    const html = await sr.text();
    const data = JSON.parse(html.match(/var ytInitialData = (\{.*?\});<\/script>/s)[1]);
    const found = [];
    const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.lockupViewModel) found.push(o.lockupViewModel); Object.values(o).forEach(walk); } };
    walk(data);
    const have = new Set(videos.map((v) => v.id));
    const now = new Date().toISOString();
    for (const l of found) {
      const id = l.contentId, title = l.metadata?.lockupMetadataViewModel?.title?.content;
      if (id && title && /^[\w-]{11}$/.test(id) && !have.has(id) && /world championship/i.test(title) && (/\bgame\s*\d+/i.test(title) || /no commentary/i.test(title))) { videos.push({ id, title, published: now }); have.add(id); }
    }
  } catch (e) { console.warn(`canlı yayın sekmesi okunamadı (${e.message})`); }
  // Maç basın toplantıları ("Press Conference | Game N | …") RSS'ten (son ~15 video) çabuk düşer: kanalın "Videolar" sekmesinden eklenir (LiveMatch "Basın toplantısı" kartı).
  try {
    const vr = await fetch(`https://www.youtube.com/channel/${CHANNEL}/videos?hl=en`, { signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'en' } });
    const data = JSON.parse((await vr.text()).match(/var ytInitialData = (\{.*?\});<\/script>/s)[1]);
    const found = [];
    const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.lockupViewModel) found.push(o.lockupViewModel); Object.values(o).forEach(walk); } };
    walk(data);
    const have = new Set(videos.map((v) => v.id));
    const day = new Date(Date.now() - 36e5).toISOString();
    for (const l of found) {
      const id = l.contentId, title = l.metadata?.lockupMetadataViewModel?.title?.content;
      if (id && title && /^[\w-]{11}$/.test(id) && !have.has(id) && /press conference/i.test(title) && /world championship 2026/i.test(title) && /\bgame\s*\d+/i.test(title)) { videos.push({ id, title, published: day }); have.add(id); }
    }
  } catch (e) { console.warn(`videolar sekmesi okunamadı (${e.message})`); }
  writeFileSync(OUT, JSON.stringify({ channel: '@FIDE_chess', updated: new Date().toISOString(), videos }, null, 1) + '\n');
  console.log(`fide-videos.json: ${videos.length} video`);
} catch (e) {
  let kept = 'dosya yok';
  try { kept = `${JSON.parse(readFileSync(OUT, 'utf8')).videos.length} video korundu`; } catch { /* yok */ }
  console.warn(`fide-videos.json güncellenemedi (${e.message}); ${kept}`);
}
