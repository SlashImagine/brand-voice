/**
 * Lightweight website crawler — extracts text content from pages.
 * Zero dependencies, uses native fetch.
 */

const IGNORED_TAGS = new Set([
  "script", "style", "noscript", "svg", "path", "meta", "link",
  "iframe", "img", "video", "audio",
  // NOTE: nav and header intentionally included — they often contain
  // the most concentrated brand copy (taglines, CTAs, positioning statements)
]);

/**
 * Crawl a website and extract text content from pages.
 * @param {string} startUrl
 * @param {{ maxPages?: number, log?: Function }} opts
 * @returns {Promise<{ url: string, title: string, text: string }[]>}
 */
export async function crawlSite(startUrl, opts = {}) {
  const { maxPages = 8, log = () => {} } = opts;
  const base = new URL(startUrl);
  const visited = new Set();
  const queue = [startUrl];
  const pages = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift();
    const normalized = normalizeUrl(url);
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    try {
      log(`Fetching ${url}`);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "voiceprint/2.0 (https://github.com/SlashImagine/brand-voice)",
          "Accept": "text/html",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) continue;

      const html = await res.text();
      const title = extractTitle(html);
      const text = extractText(html);

      if (text.length < 100) continue; // skip thin pages

      pages.push({ url, title, text: text.slice(0, 15000) });
      log(`  ✓ ${title || url} (${text.length} chars)`);

      // Find internal links for more content
      if (pages.length < maxPages) {
        const links = extractLinks(html, base);
        for (const link of links) {
          if (!visited.has(normalizeUrl(link)) && queue.length < maxPages * 3) {
            queue.push(link);
          }
        }
      }
    } catch {
      log(`  ✗ Failed: ${url}`);
    }
  }

  return pages;
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    return u.href.replace(/\/+$/, "");
  } catch {
    return url;
  }
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : "";
}

function extractText(html) {
  // Remove ignored elements
  let clean = html;
  for (const tag of IGNORED_TAGS) {
    const re = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi");
    clean = clean.replace(re, " ");
  }
  // Remove all remaining tags
  clean = clean.replace(/<[^>]+>/g, " ");
  // Decode common entities
  clean = clean
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Collapse whitespace
  clean = clean.replace(/\s+/g, " ").trim();
  return clean;
}

function extractLinks(html, base) {
  const links = [];
  const re = /href="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const u = new URL(m[1], base);
      if (u.hostname === base.hostname && u.protocol.startsWith("http")) {
        const path = u.pathname.toLowerCase();
        if (
          !path.match(/\.(png|jpg|gif|svg|css|js|pdf|zip|ico|woff|ttf)$/) &&
          !path.includes("/api/") &&
          !path.includes("/admin/") &&
          !path.includes("/login") &&
          !path.includes("/signup") &&
          !path.includes("/cart")
        ) {
          u.hash = "";
          links.push(u.href);
        }
      }
    } catch {}
  }
  // Prioritize brand-story-rich pages first
  return links.sort((a, b) => {
    const score = (url) => {
      if (/about|story|our-story|who-we-are|mission|values|manifesto|culture|belief|purpose/i.test(url)) return 0;
      if (/blog|post|article|journal|dispatch|news/i.test(url)) return 1;
      if (/product|feature|solution|how-it-works/i.test(url)) return 2;
      if (/pricing/i.test(url)) return 3;
      return 5;
    };
    return score(a) - score(b);
  });
}
