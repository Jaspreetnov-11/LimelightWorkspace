// news.mjs - headlines from Google News RSS (India edition, English or Hindi), cached for 10 minutes.
const TOPICS = {
  top: '', india: 'NATION', world: 'WORLD', business: 'BUSINESS', tech: 'TECHNOLOGY', sports: 'SPORTS', entertainment: 'ENTERTAINMENT', science: 'SCIENCE', health: 'HEALTH',
};
const cache = new Map();

const decode = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).trim();
const tag = (x, t) => decode(x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] || '');

export async function news({ topic = 'top', q = '', lang = 'en' } = {}) {
  const loc = lang === 'hi' ? 'hl=hi&gl=IN&ceid=IN:hi' : 'hl=en-IN&gl=IN&ceid=IN:en';
  const url = q ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${loc}`
    : TOPICS[topic] ? `https://news.google.com/rss/headlines/section/topic/${TOPICS[topic]}?${loc}` : `https://news.google.com/rss?${loc}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < 10 * 60e3) return hit.items;
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 LimelightOffice' }, signal: AbortSignal.timeout(12e3) });
  if (!r.ok) throw new Error(`News feed error ${r.status}`);
  const xml = await r.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 60).map(([, x]) => {
    const source = tag(x, 'source');
    let title = tag(x, 'title');
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -source.length - 3);
    return { title, link: tag(x, 'link'), source, date: Date.parse(tag(x, 'pubDate')) || 0 };
  });
  cache.set(url, { at: Date.now(), items });
  return items;
}
export const topics = Object.keys(TOPICS);
