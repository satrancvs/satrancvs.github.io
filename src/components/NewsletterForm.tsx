import { useState } from 'react';
import { Mail } from 'lucide-react';

// Bülten kaydı Sender (sender.net) formuna gider. Sender'ın kendi gömülü formu (iframe) tasarımı sitenin
// CSS'ine açık olmadığı için form burada çizilir; kayıt, Sender'ın formunun kullandığı herkese açık adrese gönderilir.
const SENDER_API = 'https://stats.sender.net';
const SENDER_FORM = 'aKr3VR';

type Status = 'idle' | 'sending' | 'done' | 'error';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch(`${SENDER_API}/forms/${SENDER_FORM}/subscribe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), site_visit: true, url: window.location.href }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || '');
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setMessage('Kayıt alınamadı. E-posta adresini kontrol edip tekrar dene.');
    }
  };

  if (status === 'done') {
    return (
      <div role="status" className="newsletter-form">
        <p className="f-display text-2xl md:text-3xl">Teşekkürler.</p>
        <p className="mt-3 text-[#A89A88]">Kaydın alındı. Bir sonraki sayıyı e-postana göndereceğiz.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="newsletter-form">
      <div className="flex flex-col sm:flex-row gap-3">
        <label htmlFor="em" className="sr-only">E-posta</label>
        <input id="em" name="email" type="email" required autoComplete="email" maxLength={320} value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="e-posta adresin"
          className="flex-1 min-w-0 h-14 bg-transparent border-b border-[#F1E9DC]/40 focus:border-[#C8893E] outline-none mono-field text-[#F1E9DC] placeholder:text-[#A89A88] transition-colors" />
        <button type="submit" disabled={status === 'sending'}
          className="btn-mono h-14 px-8 rounded-full bg-[#F1E9DC] text-[#0E0C0A] inline-flex items-center gap-2 justify-center hover:bg-white transition-colors disabled:opacity-60">
          <Mail size={18} /> {status === 'sending' ? 'Gönderiliyor…' : 'Abone ol'}
        </button>
      </div>
      <p aria-live="polite" className={`mono-note mt-3 min-h-[1.25rem] ${status === 'error' ? 'text-[#E07A5F]' : 'text-[#A89A88]'}`}>
        {status === 'error' ? message : 'Gizliliğine değer veriyoruz: e-posta adresin yalnızca bülten için kullanılır, istediğin an abonelikten çıkabilirsin.'}
      </p>
    </form>
  );
}
