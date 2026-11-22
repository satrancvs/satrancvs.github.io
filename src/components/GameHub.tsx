import { useState } from 'react';
import LiveMatch from '@/components/LiveMatch';
import MatchPicker from '@/components/MatchPicker';
import type { PickItem } from '@/components/MatchPicker';

// Dünya Şampiyonası 2026 yazısının üstündeki tek oynatıcı: menüdeki sekmelerle 2026 maçının canlı bölümü (geri sayım dahil) ve
// yazıdaki seçme oyun grupları (ünvan maçlarından seçmeler, şampiyonları yenen efsaneler) arasında geçilir.
export default function GameHub({ ready, groups }: { ready: boolean; groups: { label: string; items: PickItem[]; flat?: boolean }[] }) {
  const [tab, setTab] = useState(0);
  const labels = ['2026 maçı · Canlı', ...groups.map((g) => g.label)];
  return (
    <section className="hub" aria-label="Oyunlar">
      {groups.length > 0 && <div className="hub-tabs" role="tablist" aria-label="Oyun menüsü">
        {labels.map((l, i) => (
          <button key={l} type="button" role="tab" aria-selected={tab === i} className={`f-mono${tab === i ? ' on' : ''}`} onClick={() => setTab(i)}>{l}</button>
        ))}
      </div>}
      {tab === 0 ? <LiveMatch ready={ready} /> : <MatchPicker key={tab} items={groups[tab - 1].items} flat={groups[tab - 1].flat} />}
    </section>
  );
}
