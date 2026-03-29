/**
 * Smart website crawler — extracts text content with semantic zone weighting.
 * Zero dependencies, uses native fetch.
 */

const IGNORED_TAGS = new Set([
  "script", "style", "noscript", "svg", "path", "meta", "link",
  "iframe", "img", "video", "audio",
]);

/** Pages most likely to contain real brand voice */
const VOICE_PATH_PATTERNS = [
  /\/(about|story|our-story|mission|values|manifesto|culture|philosophy|who-we-are)/i,
  /\/(blog|posts?|articles?|news|journal|magazine)/i,
  /\/(careers?|join|team|people)/i,
];

/** Pages to de-prioritize — these rarely contain brand voice */
const NOISE_PATH_PATTERNS = [
  /\/(shop|products?|collections?|catalog|store|merchandise)/i,
  /\/(cart|checkout|account|login|signup|register|auth)/i,
  /\/(api|admin|dashboard|settings|legal|privacy|terms|cookie)/i,
  /\/(faq|help|support|contact|sitemap)/i,
];

/**
 * Crawl a website and extract text content from pages with semantic weighting.
 * @param {string} startUrl
 * @param {{ maxPages?: number, log?: Function }} opts
 * @returns {Promise<{ url: string, title: string, text: string, weightedText: string, zone: string }[]>}
 */
export async function crawlSite(startUrl, opts = {}) {
  const { maxPages = 8, log = () => {} } = opts;
  const base = new URL(startUrl);
  const visited = new Set();
  const queue = [{ url: startUrl, priority: 0 }];
  const pages = [];

  // Seed the queue with common voice-rich paths (they'll be tried if other links don't pan out)
  const voicePaths = [
    "/about", "/about-us", "/our-story", "/story", "/mission", "/values",
    "/manifesto", "/who-we-are", "/culture", "/philosophy",
    "/blog", "/journal", "/news",
    "/careers", "/team", "/people",
  ];
  for (const vp of voicePaths) {
    try {
      const voiceUrl = new URL(vp, base).href;
      const norm = normalizeUrl(voiceUrl);
      if (!visited.has(norm)) {
        queue.push({ url: voiceUrl, priority: scoreUrlPriority(vp) });
      }
    } catch {}
  }

  while (queue.length > 0 && pages.length < maxPages) {
    // Sort by priority (lower = better)
    queue.sort((a, b) => a.priority - b.priority);
    const { url } = queue.shift();
    const normalized = normalizeUrl(url);
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    try {
      log(`Fetching ${url}`);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "tonethief/2.0 (https://github.com/SlashImagine/tonethief)",
          "Accept": "text/html",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) continue;

      const html = await res.text();
      const title = extractTitle(html);
      const { text, weightedText, zones } = extractTextWithZones(html);

      if (text.length < 80) continue; // skip thin pages

      // Deduplicate by content (catches locale variants with identical content)
      const contentHash = simpleHash(text.slice(0, 2000));
      const isDuplicate = pages.some((p) => simpleHash(p.text.slice(0, 2000)) === contentHash);
      if (isDuplicate) {
        log(`  ⊘ Skipped (duplicate content): ${url}`);
        continue;
      }

      const zone = classifyPage(url);
      pages.push({
        url,
        title,
        text: text.slice(0, 20000),
        weightedText: weightedText.slice(0, 30000),
        zone,
      });
      log(`  ✓ ${title || url} (${text.length} chars, zone: ${zone})`);

      // Find internal links for more content
      if (pages.length < maxPages) {
        const links = extractLinks(html, base);
        for (const link of links) {
          if (!visited.has(normalizeUrl(link.url)) && queue.length < maxPages * 4) {
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

/**
 * Classify a page by its URL path to determine its likely content type.
 */
function classifyPage(url) {
  const path = new URL(url).pathname.toLowerCase();
  if (path === "/" || path === "") return "homepage";
  if (VOICE_PATH_PATTERNS.some((p) => p.test(path))) return "voice";
  if (NOISE_PATH_PATTERNS.some((p) => p.test(path))) return "noise";
  return "general";
}

/**
 * Extract text with semantic zone weighting.
 * Returns both raw text and weighted text (where important zones are repeated for emphasis).
 */
function extractTextWithZones(html) {
  const zones = { hero: "", headings: "", main: "", general: "", noise: "" };

  // Extract hero/marketing content (high weight)
  const heroPatterns = [
    /<(?:section|div)[^>]*class="[^"]*(?:hero|banner|jumbotron|splash|masthead|headline|tagline|intro|manifesto)[^"]*"[^>]*>([\s\S]*?)<\/(?:section|div)>/gi,
    /<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/gi,
    /<[^>]*role="main"[^>]*>([\s\S]*?)<\/[^>]*>/gi,
  ];
  for (const pattern of heroPatterns) {
    let m;
    while ((m = pattern.exec(html)) !== null) {
      zones.hero += " " + stripTags(m[1]);
    }
  }

  // Extract headings (medium-high weight — distilled brand language)
  const headingPattern = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let hm;
  while ((hm = headingPattern.exec(html)) !== null) {
    zones.headings += " " + stripTags(hm[1]);
  }

  // Extract nav/footer (low weight — boilerplate)
  const noisePattern = /<(?:nav|footer|aside|header)[^>]*>([\s\S]*?)<\/(?:nav|footer|aside|header)>/gi;
  let nm;
  while ((nm = noisePattern.exec(html)) !== null) {
    zones.noise += " " + stripTags(nm[1]);
  }

  // Full page text (for general analysis)
  const fullText = stripFullPage(html);
  zones.general = fullText;

  // Build weighted text: hero 3x, headings 2x, general 1x, noise 0.3x
  // We achieve weighting by repeating text segments
  const weightedParts = [];
  if (zones.hero.trim()) {
    weightedParts.push(zones.hero.trim());
    weightedParts.push(zones.hero.trim());
    weightedParts.push(zones.hero.trim());
  }
  if (zones.headings.trim()) {
    weightedParts.push(zones.headings.trim());
    weightedParts.push(zones.headings.trim());
  }
  weightedParts.push(zones.general.trim());
  // Noise is NOT added to weighted text (effectively 0 weight)

  return {
    text: fullText,
    weightedText: weightedParts.join(" "),
    zones,
  };
}

function stripTags(html) {
  // Remove ignored tag contents
  let clean = html;
  for (const tag of IGNORED_TAGS) {
    const re = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi");
    clean = clean.replace(re, " ");
  }
  clean = clean.replace(/<[^>]+>/g, " ");
  return decodeEntities(clean).replace(/\s+/g, " ").trim();
}

function stripFullPage(html) {
  let clean = html;
  for (const tag of IGNORED_TAGS) {
    const re = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi");
    clean = clean.replace(re, " ");
  }
  // Also strip nav/footer for cleaner general text
  clean = clean.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  clean = clean.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  clean = clean.replace(/<[^>]+>/g, " ");
  return decodeEntities(clean).replace(/\s+/g, " ").trim();
}

/**
 * Simple hash for content deduplication — not cryptographic, just fast.
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
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
          !path.match(/\.(png|jpg|jpeg|gif|svg|css|js|pdf|zip|ico|woff|woff2|ttf|eot|mp4|mp3|webp|avif)$/) &&
          !path.includes("/api/") &&
          !path.includes("/admin/") &&
          // Skip pure locale selector pages (e.g., /en-us, /fr-ca, /de but not /about, /blog)
          !path.match(/^\/[a-z]{2}(-[a-z]{2,3})?\/?$/)
        ) {
          u.hash = "";
          const priority = scoreUrlPriority(u.pathname);
          links.push({ url: u.href, priority });
        }
      }
    } catch {}
  }
  // Deduplicate
  const seen = new Set();
  return links.filter((l) => {
    const norm = normalizeUrl(l.url);
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

/**
 * Score URL priority — lower = crawl sooner.
 * Voice-rich pages get priority 0-1, noise pages get 8-9.
 */
function scoreUrlPriority(pathname) {
  const path = pathname.toLowerCase();
  // Highest priority: about, story, mission pages
  if (/\/(about|story|our-story|mission|values|manifesto|who-we-are|culture|philosophy)$/i.test(path)) return 0;
  if (/\/(about|story|mission|values)/.test(path)) return 1;
  // High priority: blog posts (first few)
  if (/\/(blog|journal|magazine|news)$/i.test(path)) return 2;
  if (/\/(blog|journal|news)\//.test(path)) return 3;
  // Medium: careers, team
  if (/\/(careers?|team|people|join)/.test(path)) return 4;
  // Low: general pages
  if (/\/(features?|pricing|solutions?)/.test(path)) return 6;
  // Noise: product/shop pages
  if (NOISE_PATH_PATTERNS.some((p) => p.test(path))) return 9;
  // Locale variants are noise
  if (/^\/[a-z]{2}(-[a-z]{2,3})?\/?$/.test(path)) return 10;
  return 5;
}
