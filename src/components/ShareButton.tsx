import { useCallback, useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';

// Yazı sayfalarında sağ altta duran paylaş düğmesi (sağ üstteki tema ve kapat düğmeleriyle aynı biçimde).
// Dokunmatik cihazlarda (telefon, tablet) yerel paylaşım sayfası açılır (`navigator.share`); masaüstünde bağlantı panoya kopyalanır ve kısa bir bildirim görünür.
// Pano erişimi yoksa (eski tarayıcı, izin verilmedi) gizli bir metin alanı ve `execCommand('copy')` denenir; o da olmazsa bağlantı bir kutuda gösterilir.
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* güvensiz bağlam ya da izin yok: aşağıdaki yedek yola düşülür */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function ShareButton({ title, url }: { title: string; url: string }) {
  const [note, setNote] = useState('');
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flash = useCallback((text: string) => {
    setNote(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote(''), 2200);
  }, []);

  const share = useCallback(async () => {
    const data = { title, url };
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    if (touch && typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return; // okur paylaşım sayfasını kapattı
        /* paylaşım başarısız: bağlantıyı kopyalamaya düşülür */
      }
    }
    if (await copyText(url)) flash('Bağlantı kopyalandı');
    else window.prompt('Bağlantıyı kopyalayın:', url);
  }, [title, url, flash]);

  return (
    <>
      <button
        type="button"
        onClick={share}
        aria-label="Yazıyı paylaş"
        title="Paylaş"
        style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        className="fixed right-5 z-50 w-12 h-12 rounded-full border border-[color:rgb(var(--fg-rgb)/0.4)] bg-[color:var(--bg)] text-[color:var(--fg)] grid place-items-center hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition-colors"
      >
        <Share2 size={20} aria-hidden />
      </button>
      <div role="status" aria-live="polite" className="fixed right-5 z-50 pointer-events-none" style={{ bottom: 'calc(max(1.25rem, env(safe-area-inset-bottom)) + 3.75rem)' }}>
        {note && <span className="btn-mono block rounded-full bg-[color:var(--fg)] text-[color:var(--bg)] px-4 py-2 whitespace-nowrap">{note}</span>}
      </div>
    </>
  );
}
