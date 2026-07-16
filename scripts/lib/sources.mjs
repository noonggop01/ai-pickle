const USER_AGENT = 'ai-pickle-keyword-bot/1.0 (contact: contact@example.com)';

// Google Trends' realtime/daily trending searches feed (US). Public, no API key.
// Gives relative "what's hot right now" signal, not absolute search volume.
export async function fetchGoogleTrends(geo = 'US') {
  const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) {
    console.error(`[google-trends] request failed: ${res.status}`);
    return [];
  }
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  return items.map((match, index) => {
    const block = match[1];
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '';
    const traffic = block.match(/approx_traffic>([\s\S]*?)</)?.[1]?.trim() ?? null;
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? '';
    return {
      source: 'google_trends',
      title,
      url: link,
      rank: index + 1,
      raw_signal: traffic,
    };
  });
}

// Hacker News via the public Algolia API — no auth required.
export async function fetchHackerNews(query = 'AI', daysBack = 7, hitsPerPage = 50) {
  const since = Math.floor(Date.now() / 1000) - daysBack * 24 * 60 * 60;
  const url = `https://hn.algolia.com/api/v1/search?tags=story&query=${encodeURIComponent(query)}&numericFilters=created_at_i%3E${since}&hitsPerPage=${hitsPerPage}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    console.error(`[hacker-news] request failed: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return (data.hits ?? [])
    .filter((hit) => hit.title)
    .map((hit) => ({
      id: hit.objectID,
      source: 'hacker_news',
      matchedQuery: query,
      title: hit.title,
      url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
      points: hit.points ?? 0,
    }));
}

// Runs fetchHackerNews across several tool-specific queries (better signal
// for review/comparison content than one broad "AI" query) and dedupes by
// story id, keeping the highest point count if a story matched more than
// one query.
export async function fetchHackerNewsForQueries(queries, daysBack = 7) {
  const batches = await Promise.all(queries.map((q) => fetchHackerNews(q, daysBack)));
  const byId = new Map();
  for (const hit of batches.flat()) {
    const existing = byId.get(hit.id);
    if (!existing || hit.points > existing.points) {
      byId.set(hit.id, hit);
    }
  }
  return [...byId.values()];
}

// NOTE: Reddit's public JSON endpoints now return 403 for most non-browser
// traffic (including datacenter/CI IPs), regardless of User-Agent. Making
// this reliable requires a free Reddit "script" app (OAuth client
// credentials) rather than the old unauthenticated read-only access. Left
// here for that future upgrade; not called from the agent today.
export async function fetchReddit(subreddits = ['artificial', 'ChatGPT', 'OpenAI'], limit = 25) {
  const results = [];
  for (const sub of subreddits) {
    const url = `https://www.reddit.com/r/${sub}/top.json?t=week&limit=${limit}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) {
      console.error(`[reddit] r/${sub} request failed: ${res.status}`);
      continue;
    }
    const data = await res.json();
    const posts = data?.data?.children ?? [];
    for (const post of posts) {
      const p = post.data;
      if (!p || p.stickied) continue;
      results.push({
        source: `reddit:r/${sub}`,
        title: p.title,
        url: `https://reddit.com${p.permalink}`,
        points: p.ups ?? 0,
      });
    }
  }
  return results;
}
