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
  writeFileSync(OUT, JSON.stringify({ channel: '@FIDE_chess', updated: new Date().toISOString(), videos }, null, 1) + '\n');
  console.log(`fide-videos.json: ${videos.length} video`);
} catch (e) {
  let kept = 'dosya yok';
  try { kept = `${JSON.parse(readFileSync(OUT, 'utf8')).videos.length} video korundu`; } catch { /* yok */ }
  console.warn(`fide-videos.json güncellenemedi (${e.message}); ${kept}`);
}
