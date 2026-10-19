import { useEffect, useRef } from 'react';

// Sender (sender.net) gömülü formu. Hesap kimliği ve form kimliği herkese açık değerlerdir.
const SENDER_ACCOUNT = '9750f024779783';
const SENDER_FORM = 'aKr3VR';
const SENDER_SRC = 'https://cdn.sender.net/accounts_resources/universal.js';
const SCRIPT_ID = 'sender-universal';

type SenderWindow = Window & { Sender?: string; sender?: unknown };

// Sender'ın kurulum kodunun karşılığı (https://cdn.sender.net/accounts_resources/universal.js).
function loadSender() {
  const w = window as SenderWindow;
  // Ana sayfaya dönüşte form div'i yeniden oluşur; script eski div'i bulmuş olacağından temiz bir yükleme yapılır.
  document.getElementById(SCRIPT_ID)?.remove();
  delete w.sender;
  w.Sender = 'sender';
  const q: unknown[] = [];
  const sender = ((...args: unknown[]) => { q.push(args); }) as ((...a: unknown[]) => void) & { q?: unknown[]; l?: number; on?: (e: string, cb: () => void) => void; listeners?: Record<string, Array<() => void>> };
  sender.q = q;
  sender.l = Date.now();
  sender.on = (event, callback) => {
    sender.listeners = sender.listeners || {};
    (sender.listeners[event] = sender.listeners[event] || []).push(callback);
  };
  w.sender = sender;
  const s = document.createElement('script');
  s.id = SCRIPT_ID;
  s.async = true;
  s.src = SENDER_SRC;
  document.head.appendChild(s);
  sender(SENDER_ACCOUNT);
}

// Üçüncü taraf script'i yalnızca form görünür alana yaklaşınca yüklenir (makale sayfalarında hiç yüklenmez).
export default function NewsletterForm() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const start = () => { if (!done) { done = true; loadSender(); } };
    if (typeof IntersectionObserver === 'undefined') { start(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
    }, { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="newsletter-form min-h-[3.5rem]">
      <div className="sender-form-field" data-sender-form-id={SENDER_FORM} />
    </div>
  );
}
