const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ACCOUNT = 'meva.labs';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

function secureURL(value, type) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (type === 'post') {
      if (!['instagram.com', 'www.instagram.com'].includes(host)) return null;
      if (!/^\/(p|reel|tv)\/[^/]+\/?$/.test(url.pathname)) return null;
      url.search = ''; url.hash = '';
    } else if (!['cdninstagram.com', 'fbcdn.net'].some(domain => host === domain || host.endsWith('.' + domain))) return null;
    return url.href;
  } catch { return null; }
}

export function normalizePosts(rows) {
  if (!Array.isArray(rows)) throw new Error('Invalid media list');
  const posts = [];
  for (const row of rows) {
    if (!['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'].includes(row.media_type)) continue;
    const permalink = secureURL(row.permalink, 'post');
    // Videos use their official preview image, with a video badge and original link.
    // Do not download/play all six videos on page load.
    const image = secureURL(row.media_type === 'VIDEO' ? row.thumbnail_url : row.media_url, 'media');
    const timestamp = Date.parse(row.timestamp);
    if (!permalink || !image || !Number.isFinite(timestamp)) continue;
    posts.push({id: String(row.id), type: row.media_type, image, permalink, caption: String(row.caption || '').slice(0, 1500), timestamp: new Date(timestamp).toISOString()});
  }
  return posts.sort((a,b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0,6);
}

export function createInstagramHandler({fetchImpl = fetch, env = process.env, now = Date.now} = {}) {
  let cached = null;
  let pending = null;
  async function query(id, resource, token, version) {
    const url = new URL(`https://graph.instagram.com/${version}/${id}${resource}`);
    url.searchParams.set('fields', resource ? FIELDS : 'username');
    if (resource) url.searchParams.set('limit', '12');
    const response = await fetchImpl(url, {headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('Instagram unavailable');
    const data = await response.json();
    if (data.error) throw new Error('Instagram unavailable');
    return data;
  }
  function json(body, status, sharedSeconds = 60) {
    return new Response(JSON.stringify(body), {status, headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${status === 200 ? 300 : 30}`,
      'Netlify-CDN-Cache-Control': `public, s-maxage=${sharedSeconds}, stale-while-revalidate=300`,
      'X-Content-Type-Options': 'nosniff'
    }});
  }
  return async request => {
    if (request.method !== 'GET') return new Response(null, {status: 405, headers: {Allow: 'GET'}});
    const token = env.INSTAGRAM_ACCESS_TOKEN;
    const id = env.INSTAGRAM_USER_ID;
    const version = env.INSTAGRAM_API_VERSION || 'v25.0';
    if (!token || !/^\d+$/.test(id || '') || !/^v\d+\.\d+$/.test(version)) {
      return json({status: 'unavailable', posts: []}, 503);
    }
    // Module cache reduces calls on a warm instance; CDN cache is shared across visitors.
    const key = `${id}:${token}:${version}`;
    if (cached?.key === key && now() - cached.at < HOUR) return json(cached.body, 200, 3600);
    try {
      if (!pending || pending.key !== key) {
        const work = Promise.all([query(id, '', token, version), query(id, '/media', token, version)]).then(([profile, media]) => {
          if (profile.username?.toLowerCase() !== ACCOUNT) throw new Error('Unexpected account');
          const body = {status: 'ok', username: ACCOUNT, updatedAt: new Date(now()).toISOString(), posts: normalizePosts(media.data)};
          cached = {key, at: now(), body};
          return body;
        });
        pending = {key, work};
      }
      const work = pending.work;
      try { return json(await work, 200, 3600); }
      finally { if (pending?.work === work) pending = null; }
    } catch {
      // Never return/log upstream error bodies or access tokens.
      if (cached?.key === key && now() - cached.at < DAY) return json({...cached.body, status: 'stale'}, 200);
      return json({status: 'unavailable', posts: []}, 503);
    }
  };
}

export default createInstagramHandler();
