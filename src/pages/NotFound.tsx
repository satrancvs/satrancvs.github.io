import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../site.css';

export default function NotFound() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Sayfa bulunamadı — Satranç vs.';
    return () => { document.title = prev; };
  }, []);
  return (
    <div className="sk min-h-screen grid place-items-center px-6 text-center">
      <div>
        <p className="f-mono text-[#C8893E]">404</p>
        <h1 className="f-display text-[clamp(44px,8vw,120px)] mt-6">Sayfa <em className="italic text-[#C8893E]">bulunamadı.</em></h1>
        <Link to="/" className="btn-mono mt-10 inline-flex items-center rounded-full bg-[#F1E9DC] text-[#0E0C0A] h-14 px-8 hover:bg-[#C8893E] transition-colors">Ana sayfaya dön</Link>
      </div>
    </div>
  );
}
