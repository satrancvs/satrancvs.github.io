export const PHOTO = {
  src: `${import.meta.env.BASE_URL}images/jan-timman-1973.jpg`,
  alt: 'Jan Timman, AVRO satranç turnuvası, 1973 (siyah-beyaz fotoğraf)',
  page: 'https://commons.wikimedia.org/wiki/File:AVRO-schaaktoernooi,_Jan_Timman,_Bestanddeelnr_926-4781.jpg',
  license: 'https://creativecommons.org/publicdomain/zero/1.0/deed.tr',
};

export default function PhotoCredit({ className = '' }: { className?: string }) {
  const link = 'underline underline-offset-2 hover:text-[#F1E9DC]';
  return (
    <p className={`credit text-[#A89A88] ${className}`}>
      <span lang="nl">Jan Timman</span>, 1973 · Fotoğraf: <span lang="nl">Rob Mieremet / Anefo</span> · Hollanda Ulusal Arşivi · Lisans:{' '}
      <a href={PHOTO.license} target="_blank" rel="noreferrer" className={link}>CC0 1.0 (Kamu Bağışı)</a>
      {' '}· Kaynak: <a href={PHOTO.page} target="_blank" rel="noreferrer" lang="en" className={link}>Wikimedia Commons</a>
    </p>
  );
}
