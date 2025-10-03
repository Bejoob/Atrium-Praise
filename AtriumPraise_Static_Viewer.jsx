/**
 * Atrium Praise - Static Songs Viewer (Single-file React Component)
 *
 * Como usar:
 * 1) Cole este arquivo (AtriumPraise_Static_Viewer.jsx) no seu projeto React/Vite/Next.
 * 2) Garanta que Tailwind CSS esteja configurado no projeto (ou adapte as classes).
 * 3) Edite o array SONGS abaixo para adicionar/alterar músicas manualmente.
 *
 * Estrutura de cada música:
 * {
 *   id: string,              // único
 *   title: string,           // título obrigatório
 *   link: string,            // URL (YouTube, Spotify, etc.)
 *   key: string,             // tom (ex: A, G#m, C)
 *   tags?: string[]          // opcional, ex: ['adoração', 'louvor']
 *   chorus?: string          // opcional, pequeno trecho do coro para identificação
 *   lastPlayedDate?: string  // opcional, última data cantada (ex: '2025-09-15' ou '15/09/2025')
 * }
 *
 * Publicação (estático):
 * - GitHub Pages: crie um repositório, faça build (ex: Vite/React), publique via GitHub Pages nas configurações.
 * - Vercel: importe o repositório no painel da Vercel, selecione o framework e faça o deploy.
 * - Netlify: conecte seu repositório no Netlify e faça o deploy. Use a build command do seu bundler (ex: `npm run build`).
 *
 * Observações:
 * - Não há backend. Os dados vivem somente no array SONGS.
 * - Interface mobile-first, somente leitura para consulta dos membros.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';

// ===============================================================
// 1) DADOS: Edite o array SONGS abaixo para gerenciar as músicas
// ===============================================================
const SONGS = [
  // Exemplo de seed (pode apagar/editar):
  { id: '1', title: 'O Que Sua Glória Fez Comigo', link: 'https://www.youtube.com/watch?v=9fZph9kZkgM&list=RD9fZph9kZkgM&start_radio=1', key: 'C', tags: ['adoração'], chorus: 'Quem ja pisou no Santo dos Santos...', lastPlayedDate: '' },
  { id: '2', title: 'Digino de tudo', link: 'https://www.youtube.com/watch?v=cQlEODXxnu0&list=RDcQlEODXxnu0&start_radio=1', key: 'F', tags: ['louvor'], chorus: 'Os santos e os Anjos', lastPlayedDate: '' },
  { id: '3', title: 'Quem é esse', link: 'https://www.youtube.com/watch?v=0ZF5em0MTwY&list=RD0ZF5em0MTwY&start_radio=1', key: 'B', tags: ['adoração'], chorus: 'Quem é esse, que era sem pecado e não me condenou...', lastPlayedDate: '' },
  { id: '4', title: 'Maravilhosa Graça', link: 'https://www.youtube.com/watch?v=nv-T2_JPKZA&list=RDnv-T2_JPKZA&start_radio=1', key: 'D', tags: ['louvor'], chorus: 'Maravilhosa graça, seu ininito amor', lastPlayedDate: '' },
  { id: '5', title: 'Há Poder', link: 'https://www.youtube.com/watch?v=4WmlJFsxDv4', key: '?', tags: ['adoração'], chorus: 'Há Poder no teu nome, Jesus, rei sobre o trono', lastPlayedDate: '' },
  { id: '6', title: 'Tu és Deus (A Ele)', link: 'https://www.youtube.com/watch?v=6YQNTOj-OLM', key: '?', tags: ['adoração'], chorus: 'Tu és Deus (A Ele)', lastPlayedDate: '' }
];

// ===============================================================
// 2) HELPERS
// ===============================================================
function isYouTubeUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    return host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com';
  } catch {
    return false;
  }
}

function extractYouTubeId(url) {
  // Suporta formatos: https://youtu.be/ID, https://www.youtube.com/watch?v=ID, /embed/ID, e short links
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1);
    }
    if (u.searchParams.get('v')) {
      return u.searchParams.get('v');
    }
    const match = u.pathname.match(/\/embed\/([\w-]{6,})/);
    if (match) return match[1];
    // Fallback regex geral
    const generic = url.match(/(?:v=|\/)([\w-]{6,})(?:[&?].*)?$/);
    return generic ? generic[1] : '';
  } catch {
    return '';
  }
}

function toCsvValue(value) {
  const s = value ?? '';
  // Escape aspas
  const escaped = String(s).replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// ===============================================================
// 3) COMPONENTE
// ===============================================================
export default function AtriumPraise_Static_Viewer() {
  const [query, setQuery] = useState('');
  const [dateOrder, setDateOrder] = useState('none'); // 'none' | 'recent' | 'oldest'
  const [showHelp, setShowHelp] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [playerExternalUrl, setPlayerExternalUrl] = useState('');
  const [autoplay, setAutoplay] = useState(true);

  // Derivar chaves únicas a partir dos dados
  // Nota: filtro por tom removido por solicitação; chaves ainda podem ser exibidas como chip

  const normalizedQuery = query.trim().toLowerCase();

  function parseLastPlayed(dateStr) {
    if (!dateStr) return null;
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    const br = /^\d{2}\/\d{2}\/\d{4}$/;
    try {
      if (iso.test(dateStr)) {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      }
      if (br.test(dateStr)) {
        const [dd, mm, yyyy] = dateStr.split('/');
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  const filteredSongs = useMemo(() => {
    const filtered = SONGS.filter(song => {
      // Sem filtro por tom; apenas busca por título/tags
      if (!normalizedQuery) return true;
      const title = (song.title || '').toLowerCase();
      const tags = (song.tags || []).map(t => (t || '').toLowerCase());
      const inTitle = title.includes(normalizedQuery);
      const inTags = tags.some(t => t.includes(normalizedQuery));
      return inTitle || inTags;
    });
    if (dateOrder === 'recent' || dateOrder === 'oldest') {
      const sortedByDate = [...filtered].sort((a, b) => {
        const da = parseLastPlayed(a.lastPlayedDate);
        const db = parseLastPlayed(b.lastPlayedDate);
        if (!da && !db) return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
        if (!da) return 1;
        if (!db) return -1;
        return dateOrder === 'recent' ? db - da : da - db;
      });
      return sortedByDate;
    }
    const sorted = [...filtered].sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
    return sorted;
  }, [normalizedQuery, dateOrder]);

  const exportCsv = useCallback((rows, filename) => {
    const headers = ['id', 'title', 'link', 'key', 'tags'];
    const headerLine = headers.map(h => toCsvValue(h)).join(',');
    const lines = rows.map(r => {
      const tagsJoined = (r.tags || []).join(' | ');
      return [toCsvValue(r.id), toCsvValue(r.title), toCsvValue(r.link), toCsvValue(r.key), toCsvValue(tagsJoined)].join(',');
    });
    const csv = ['\ufeff' + headerLine, ...lines].join('\n'); // BOM para Excel
    downloadFile(filename, csv, 'text/csv;charset=utf-8');
  }, []);

  const onPlay = useCallback((song) => {
    if (isYouTubeUrl(song.link)) {
      const id = extractYouTubeId(song.link);
      if (id) {
        setPlayerId(id);
        setPlayerExternalUrl(song.link);
      }
    } else {
      window.open(song.link, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const closeModal = useCallback(() => { setPlayerId(''); setPlayerExternalUrl(''); }, []);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [closeModal]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-50/75 border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-indigo-600 text-white grid place-items-center font-bold">AP</div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold">Atrium Praise · Repertório</h1>
              <p className="text-xs text-slate-500">Visualização estática (somente leitura)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHelp(true)} className="text-xs sm:text-sm px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100">Instruções</button>
          </div>
        </div>
      </header>

      {/* Controls */}
      <section className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Buscar por título ou tags</label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex.: adoração, Luz do Mundo"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-9 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ordenação por data</label>
            <select
              value={dateOrder}
              onChange={(e) => setDateOrder(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="none">Sem filtro de data</option>
              <option value="recent">Tocadas recentemente</option>
              <option value="oldest">Mais antigas</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportCsv(SONGS, 'atrium_praise_todas.csv')}
            className="text-xs sm:text-sm px-3 py-2 rounded-md border border-slate-300 hover:bg-slate-100"
          >
            Exportar CSV (todas)
          </button>
          <button
            onClick={() => exportCsv(filteredSongs, 'atrium_praise_filtradas.csv')}
            className="text-xs sm:text-sm px-3 py-2 rounded-md border border-slate-300 hover:bg-slate-100"
          >
            Exportar CSV (filtradas)
          </button>
          <span className="ml-auto text-xs sm:text-sm text-slate-600">Exibindo {filteredSongs.length} / {SONGS.length} músicas</span>
        </div>
      </section>

      {/* List */}
      <main className="mx-auto max-w-5xl px-4 pb-10">
        {filteredSongs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">Nenhuma música encontrada.</div>
        ) : (
          <ul className="space-y-3">
            {filteredSongs.map(song => (
              <li key={song.id} className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{song.title}</h3>
                      {song.key && (
                        <span className="text-[11px] sm:text-xs inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 border border-indigo-100">Tom: {song.key}</span>
                      )}
                      {(song.tags || []).map(tag => (
                        <span key={tag} className="text-[11px] sm:text-xs inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 border border-slate-200">{tag}</span>
                      ))}
                    </div>
                    {song.chorus && (
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 line-clamp-2">{song.chorus}</p>
                    )}
                    {song.lastPlayedDate && (
                      <p className="mt-1 text-[11px] text-slate-500">Última vez: <span className="font-medium">{song.lastPlayedDate}</span></p>
                    )}
                    {/* Link ocultado por solicitação */}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onPlay(song)}
                      className="text-xs sm:text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Play
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Player Modal (YouTube) */}
      {playerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-3xl rounded-lg bg-white shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">Reproduzindo</span>
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} /> Autoplay
                </label>
              </div>
              <div className="flex items-center gap-2">
                {playerExternalUrl && (
                  <a href={playerExternalUrl} target="_blank" rel="noreferrer noopener" className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-100">Abrir no YouTube</a>
                )}
                <button onClick={closeModal} className="text-slate-500 hover:text-slate-800 text-sm">Fechar ✕</button>
              </div>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube-nocookie.com/embed/${playerId}?autoplay=${autoplay ? '1' : '0'}&modestbranding=1&rel=0&playsinline=1`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHelp(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-lg bg-white shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
              <span className="text-sm font-semibold">Instruções</span>
              <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-slate-800 text-sm">Fechar ✕</button>
            </div>
            <div className="p-4 text-sm text-slate-700 space-y-2">
              <p>Para editar as músicas, abra este arquivo e altere o array <code>SONGS</code> no topo. Cada item deve conter <code>id</code>, <code>title</code>, <code>link</code>, <code>key</code> e opcionalmente <code>tags</code>.</p>
              <p>A busca filtra por título e tags. Use o seletor para filtrar por tom. Clique em <em>Play</em> para abrir o player (YouTube), ou <em>Abrir fonte</em> para outros links.</p>
              <p>Botões disponíveis: <em>Copiar link</em>, <em>Copiar título + link</em>, <em>Exportar CSV (todas)</em> e <em>Exportar CSV (filtradas)</em>.</p>
              <p>Publicação recomendada: Vercel, Netlify ou GitHub Pages. Este componente não usa backend.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


