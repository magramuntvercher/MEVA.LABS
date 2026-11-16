(() => {
  const section = document.querySelector('[data-instagram-feed]');
  if (!section) return;
  const grid = section.querySelector('.instagram-feed-grid');
  const status = section.querySelector('[data-instagram-status]');
  function safeURL(value, post) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      if (post ? !['instagram.com','www.instagram.com'].includes(url.hostname) : !['cdninstagram.com','fbcdn.net'].some(h => url.hostname === h || url.hostname.endsWith('.' + h))) return null;
      return url.href;
    } catch { return null; }
  }
  async function load() {
    try {
      const response = await fetch('/.netlify/functions/instagram', {signal: AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error('Unavailable');
      const data = await response.json();
      if (!Array.isArray(data.posts)) throw new Error('Invalid response');
      const nodes = [];
      for (const post of data.posts.slice(0,6)) {
        const href = safeURL(post.permalink, true), src = safeURL(post.image, false);
        if (!href || !src) continue;
        const link = document.createElement('a');
        link.className = 'instagram-feed-post'; link.href = href;
        link.target = '_blank'; link.rel = 'noopener noreferrer';
        const caption = String(post.caption || '').trim();
        link.setAttribute('aria-label', caption ? `Ver publicación: ${caption.slice(0,180)}` : 'Ver publicación de @meva.labs en Instagram');
        const img = document.createElement('img');
        img.src = src; img.alt = caption.slice(0,240) || 'Publicación de @meva.labs';
        img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
        img.addEventListener('error', () => {
          img.hidden = true;
          const fallback = document.createElement('span');
          fallback.className = 'instagram-feed-image-fallback'; fallback.textContent = 'Ver publicación en Instagram ↗';
          link.append(fallback);
        }, {once: true});
        link.append(img);
        if (post.type === 'VIDEO' || post.type === 'CAROUSEL_ALBUM') {
          const badge = document.createElement('span');
          badge.className = 'instagram-feed-badge'; badge.textContent = post.type === 'VIDEO' ? '▶ Vídeo' : 'Varias fotos';
          link.append(badge);
        }
        nodes.push(link);
      }
      grid.replaceChildren(...nodes);
      status.textContent = nodes.length ? (data.status === 'stale' ? 'Mostramos las últimas publicaciones disponibles.' : '') : 'Descubre las novedades en nuestro perfil de Instagram.';
      status.hidden = nodes.length > 0 && data.status !== 'stale';
    } catch {
      status.textContent = 'Ahora no podemos cargar las publicaciones. Puedes verlas en nuestro perfil de Instagram.';
    } finally { grid.setAttribute('aria-busy', 'false'); }
  }
  // Fetch only when this section is near the viewport, once per page visit.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, {rootMargin: '400px'});
    observer.observe(section);
  } else { load(); }
})();
