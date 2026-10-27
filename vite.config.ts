import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import fs from 'node:fs';
import path from 'path';
import { viteSourceLocator } from '@metagptx/vite-plugin-source-locator';
import { atoms } from '@metagptx/web-sdk/plugins';
import { reactHmrGuard } from './plugins/react-hmr-guard';
import { toTypography } from './src/lib/curly.js';

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

process.env.VITE_APP_TITLE ??= process.env.OVERVIEW_TITLE ?? 'shadcnui';
process.env.VITE_APP_DESCRIPTION ??= process.env.OVERVIEW_DESCRIPTION ?? 'Atoms Generated Project';
process.env.VITE_APP_TITLE = escapeHtmlAttr(process.env.VITE_APP_TITLE);
process.env.VITE_APP_DESCRIPTION = escapeHtmlAttr(process.env.VITE_APP_DESCRIPTION);
process.env.VITE_APP_LOGO_URL ??= process.env.OVERVIEW_LOGO_URL ?? 'https://public-frontend-cos.metadl.com/mgx/img/favicon_atoms.ico';

function ensureBuildOutDir() {
  let outDir = path.resolve(__dirname, 'dist');

  return {
    name: 'ensure-build-out-dir',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      fs.mkdirSync(outDir, { recursive: true });
    },
  };
}

const SITE_URL = 'https://satrancvs.com';

// Her yazı için dist/<slug>/index.html üretir (yazıya özel başlık, açıklama ve paylaşım
// etiketleriyle) ve sitemap.xml'i yazı adresleriyle birlikte oluşturur.
function articlePages() {
  let outDir = path.resolve(__dirname, 'dist');
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const setMeta = (html: string, attr: string, key: string, value: string) =>
    html.replace(new RegExp(`(<meta[^>]*${attr}="${key}"[^>]*content=")[^"]*(")`), `$1${esc(value)}$2`);
  return {
    name: 'article-pages',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle: {
      order: 'post' as const,
      handler() {
        const articles = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src/data/articles.json'), 'utf8')).filter((a: { draft?: boolean }) => !a.draft);
        const template = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
        const urls = [`${SITE_URL}/`];
        for (const a of articles) {
          const url = `${SITE_URL}/${a.slug}/`;
          const title = `${toTypography(a.title)} — Satranç vs.`;
          // Özeti (excerpt/dek) olmayan yazıda sitenin genel açıklaması kalır.
          const descRaw = a.excerpt ?? a.dek;
          let html = template.replace(/<title[^>]*>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
          if (descRaw) {
            const desc = toTypography(descRaw.replace(/[*_]/g, ''));
            html = setMeta(html, 'name', 'description', desc);
            html = setMeta(html, 'property', 'og:description', desc);
            html = setMeta(html, 'name', 'twitter:description', desc);
          }
          html = setMeta(html, 'property', 'og:title', title);
          html = setMeta(html, 'property', 'og:type', 'article');
          html = setMeta(html, 'name', 'twitter:title', title);
          const extra = a.unlisted ? ['<meta name="robots" content="noindex, nofollow" />'] : [`<link rel="canonical" href="${url}" />`, `<meta property="og:url" content="${url}" />`];
          // Paylaşım görseli (kompakt kart): yazıdan kare fotoğraf (public/og/<id>.jpg, scripts/make-og.py), yoksa ortalanmış logo (og-logo.png; Facebook kareyi geniş karta kırparsa logo kesilmesin).
          const hasOg = fs.existsSync(path.resolve(__dirname, 'public/og', `${a.id}.jpg`));
          const img = `${SITE_URL}${hasOg ? `/og/${a.id}.jpg` : '/og-logo.png'}`;
          const side = 200;
          extra.push(`<meta property="og:image:width" content="${side}" />`, `<meta property="og:image:height" content="${side}" />`);
          extra.push(`<meta property="og:image" content="${img}" />`, `<meta name="twitter:image" content="${img}" />`);
          // Ana sayfa şablonundaki adres/görsel etiketlerini yazıya özel olanlarla değiştir (çift etiket olmasın).
          html = html.replace(/\s*<(meta property="og:(url|image(:\w+)?)"|meta name="twitter:image"|link rel="canonical")[^>]*>/g, '');
          html = html.replace('</head>', `    ${extra.join('\n    ')}\n  </head>`);
          const dir = path.join(outDir, a.slug);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, 'index.html'), html);
          if (!a.unlisted) urls.push(url);
          // Eski adresler (`oldSlugs`): yeni adrese yönlendiren küçük bir sayfa (arama motorları için canonical, tarayıcı için refresh + script).
          for (const old of a.oldSlugs ?? []) {
            const oldDir = path.join(outDir, old);
            fs.mkdirSync(oldDir, { recursive: true });
            fs.writeFileSync(path.join(oldDir, 'index.html'), `<!doctype html>\n<html lang="tr"><head><meta charset="utf-8" /><title>${esc(title)}</title><link rel="canonical" href="${url}" /><meta http-equiv="refresh" content="0; url=/${a.slug}/" /><meta name="robots" content="noindex" /><script>location.replace(${JSON.stringify(`/${a.slug}/`)} + location.hash);</script></head><body><a href="${url}">${esc(title)}</a></body></html>\n`);
          }
        }
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
        fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml);
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      viteSourceLocator({
        prefix: 'mgx', // Prefix used to identify source locations; do not change.
      }),
      reactHmrGuard(),
      react(),
      atoms(),
      ensureBuildOutDir(),
      articlePages(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0', // Listen on all network interfaces.
      port: parseInt(process.env.VITE_PORT || '3000'),
      proxy: {
        '/api': {
          target: `http://localhost:${process.env.BACKEND_PORT || '8000'}`,
          changeOrigin: true,
        },
      },
      watch: { usePolling: true, interval: 600 },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'ui-vendor': [
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-aspect-ratio',
              '@radix-ui/react-avatar',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-context-menu',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-hover-card',
              '@radix-ui/react-label',
              '@radix-ui/react-menubar',
              '@radix-ui/react-navigation-menu',
              '@radix-ui/react-popover',
              '@radix-ui/react-progress',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-slider',
              '@radix-ui/react-slot',
              '@radix-ui/react-switch',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              '@radix-ui/react-toggle',
              '@radix-ui/react-toggle-group',
              '@radix-ui/react-tooltip',
            ],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'utils-vendor': [
              'axios',
              'clsx',
              'tailwind-merge',
              'class-variance-authority',
              'date-fns',
              'lucide-react',
            ],
            'query-vendor': ['@tanstack/react-query'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
