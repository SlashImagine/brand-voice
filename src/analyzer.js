import { crawlSite } from "./crawler.js";

/**
 * Analyze a brand's voice from their website content.
 * Uses linguistic heuristics — no AI API keys needed.
 *
 * @param {string} url
 * @param {{ maxPages?: number, log?: Function }} opts
 * @returns {Promise<BrandVoiceProfile>}
 */
export async function analyzeBrandVoice(url, opts = {}) {
  const pages = await crawlSite(url, opts);

  if (pages.length === 0) {
    throw new Error(`Could not extract content from ${url}. Check the URL and try again.`);
  }

  // Use weighted text for analysis (hero/headings amplified, nav/footer suppressed)
  // If NO voice pages found, treat general/noise pages at normal weight (brand voice IS in products)
  const hasVoicePages = pages.some((p) => p.zone === "voice");
  const allWeightedText = pages
    .map((p) => {
      // Voice pages (about, story, mission) get 2x weight
      if (p.zone === "voice") return Array(2).fill(p.weightedText).join(" ");
      // If we have voice pages, noise pages get 0.5x; otherwise normal weight
      if (p.zone === "noise" && hasVoicePages) return p.weightedText.slice(0, p.weightedText.length / 2);
      return p.weightedText;
    })
    .join(" ");

  // Also keep raw text for vocabulary stats
  const allRawText = pages.map((p) => p.text).join(" ");
  const brand = extractBrandName(pages, url);

  const sentences = splitSentences(allWeightedText);
  const words = allWeightedText.split(/\s+/).filter(Boolean);
  const rawWords = allRawText.split(/\s+/).filter(Boolean);

  const tone = analyzeTone(sentences, words, allWeightedText);
  const vocabulary = analyzeVocabulary(rawWords, allRawText);
  const structure = analyzeStructure(sentences, rawWords);
  const personality = derivePersonality(tone, vocabulary, structure, allWeightedText);
  const guidelines = generateGuidelines(tone, vocabulary, structure, personality, brand);
  const aiPrompt = generateAIPrompt(brand, personality, tone, vocabulary, structure, allWeightedText);
  const summary = generateSummary(brand, personality, tone);

  return {
    brand,
    url,
    pagesAnalyzed: pages.length,
    pageBreakdown: pages.map((p) => ({ url: p.url, zone: p.zone, title: p.title })),
    summary,
    tone,
    vocabulary,
    structure,
    personality,
    guidelines,
    aiPrompt,
  };
}

function extractBrandName(pages, url) {
  if (pages[0]?.title) {
    const title = pages[0].title;
    const parts = title.split(/\s*[|–—:]\s*/);
    if (parts[0] && parts[0].length < 30) return parts[0].trim();
  }
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1);
  } catch {
    return "Brand";
  }
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5 && s.length < 500);
}

// ── Tone Analysis ──────────────────────────────────────────────

function analyzeTone(sentences, words, text) {
  const dimensions = [
    { name: "Formal ↔ Casual", left: "Formal", right: "Casual", score: measureFormality(words, text) },
    { name: "Serious ↔ Playful", left: "Serious", right: "Playful", score: measurePlayfulness(words, text) },
    { name: "Technical ↔ Accessible", left: "Technical", right: "Accessible", score: measureAccessibility(words, text) },
    { name: "Reserved ↔ Enthusiastic", left: "Reserved", right: "Enthusiastic", score: measureEnthusiasm(sentences, text) },
    { name: "Corporate ↔ Human", left: "Corporate", right: "Human", score: measureHumanness(words, text) },
    { name: "Passive ↔ Active", left: "Passive", right: "Active", score: measureActiveVoice(sentences) },
    { name: "Vague ↔ Specific", left: "Vague", right: "Specific", score: measureSpecificity(words, text) },
    { name: "Long-winded ↔ Concise", left: "Long-winded", right: "Concise", score: measureConciseness(sentences) },
    { name: "Conventional ↔ Irreverent", left: "Conventional", right: "Irreverent", score: measureIrreverence(words, text) },
    { name: "Safe ↔ Provocative", left: "Safe", right: "Provocative", score: measureProvocativeness(words, text, sentences) },
  ];

  return {
    dimensions,
    dominant: dimensions.slice().sort((a, b) => Math.abs(b.score - 5) - Math.abs(a.score - 5)).slice(0, 3),
  };
}

function measureFormality(words, text) {
  const casual = /\b(hey|yeah|cool|awesome|gonna|wanna|gotta|stuff|things|kinda|pretty|super|totally|nope|yep|ok|okay|dude|bro|yo|lol|tbh|ngl|af|legit|lowkey|highkey|vibe|vibes|chill|sick|fire|lit|fam|no cap|bruh)\b/gi;
  const formal = /\b(therefore|furthermore|consequently|regarding|pursuant|hereby|thereof|whereas|nonetheless|henceforth|accordingly|notwithstanding)\b/gi;
  const contractions = /\b(can't|won't|isn't|aren't|doesn't|don't|haven't|hasn't|wouldn't|shouldn't|couldn't|it's|we're|they're|you're|we've|I'm|let's|ain't|y'all)\b/gi;

  const casualCount = (text.match(casual) || []).length;
  const formalCount = (text.match(formal) || []).length;
  const contractionCount = (text.match(contractions) || []).length;
  const per1000 = words.length / 1000;

  let score = 5;
  score += Math.min(2.5, (casualCount / Math.max(per1000, 1)) * 0.5);
  score += Math.min(1.5, (contractionCount / Math.max(per1000, 1)) * 0.2);
  score -= Math.min(2.5, (formalCount / Math.max(per1000, 1)) * 1);

  return clamp(score);
}

function measurePlayfulness(words, text) {
  const playful = /\b(fun|love|amazing|wow|magic|delight|spark|joy|brilliant|wild|crazy|epic|hilarious|LOL|haha|absurd|insane|bonkers|ridiculous|silly|weird|wacky|gonzo|bananas|legendary|badass|murder|kill|death|destroy|crush|slay|beast|monster)\b/gi;
  const emojis = text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}]/gu) || [];
  const exclamations = (text.match(/!/g) || []).length;
  const allCaps = (text.match(/\b[A-Z]{3,}\b/g) || []).filter((w) => !["THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "CAN", "OUR", "HAS", "USA", "CEO", "CTO", "API", "URL"].includes(w)).length;
  const per1000 = words.length / 1000;

  let score = 4;
  score += Math.min(2.5, ((text.match(playful) || []).length) / Math.max(per1000, 1) * 0.4);
  score += Math.min(1, emojis.length / Math.max(per1000, 1) * 0.5);
  score += Math.min(1.5, exclamations / Math.max(per1000, 1) * 0.1);
  score += Math.min(1, allCaps / Math.max(per1000, 1) * 0.3);

  return clamp(score);
}

function measureAccessibility(words, text) {
  const technical = /\b(api|sdk|infrastructure|architecture|implementation|configuration|deployment|integration|endpoint|middleware|scalable|enterprise|leverage|utilize|bandwidth|latency|throughput|microservices?|containerized?|orchestrat)/gi;
  const techCount = (text.match(technical) || []).length;
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length;
  const per1000 = words.length / 1000;

  let score = 6;
  score -= Math.min(3, (techCount / Math.max(per1000, 1)) * 0.5);
  score -= Math.min(2, Math.max(0, avgWordLen - 5) * 0.8);

  return clamp(score);
}

function measureEnthusiasm(sentences, text) {
  const exclamations = sentences.filter((s) => s.endsWith("!")).length;
  const superlatives = /\b(best|greatest|fastest|easiest|most powerful|incredible|unbelievable|revolutionary|game-changing|extraordinary|insane|mind-blowing|legendary|unstoppable|ultimate|badass|killer|crushing it|world-class)\b/gi;
  const supCount = (text.match(superlatives) || []).length;
  const allCaps = (text.match(/\b[A-Z]{4,}\b/g) || []).length;

  let score = 4;
  score += Math.min(2.5, (exclamations / Math.max(sentences.length, 1)) * 10);
  score += Math.min(2, supCount / Math.max(sentences.length / 50, 1) * 0.5);
  score += Math.min(1, allCaps / Math.max(sentences.length, 1) * 2);

  return clamp(score);
}

function measureHumanness(words, text) {
  const corporate = /\b(synergy|leverage|utilize|optimize|streamline|solutions|ecosystem|paradigm|stakeholder|deliverable|actionable|best-in-class|value-add|bandwidth|circle back|low-hanging fruit|move the needle|thought leader|core competenc)/gi;
  const human = /\b(you|your|we|our|us|people|team|story|believe|care|help|love|share|together|community|friend|crew|squad|humans?|real|honest|actually|genuinely)\b/gi;
  const per1000 = words.length / 1000;

  const corpCount = (text.match(corporate) || []).length;
  const humanCount = (text.match(human) || []).length;

  let score = 5;
  score += Math.min(2.5, (humanCount / Math.max(per1000, 1)) * 0.08);
  score -= Math.min(3, (corpCount / Math.max(per1000, 1)) * 1);

  return clamp(score);
}

function measureActiveVoice(sentences) {
  const passive = /\b(is|are|was|were|been|being)\s+\w+ed\b/gi;
  let passiveCount = 0;
  for (const s of sentences) {
    if (passive.test(s)) passiveCount++;
    passive.lastIndex = 0;
  }
  const ratio = passiveCount / Math.max(sentences.length, 1);
  return clamp(7 - ratio * 10);
}

function measureSpecificity(words, text) {
  const numbers = (text.match(/\b\d[\d,.]*[%xXkKmM]?\b/g) || []).length;
  const vague = /\b(various|several|many|some|certain|general|overall|numerous|significant|substantial)\b/gi;
  const vagueCount = (text.match(vague) || []).length;
  const per1000 = words.length / 1000;

  let score = 5;
  score += Math.min(2.5, (numbers / Math.max(per1000, 1)) * 0.3);
  score -= Math.min(2, (vagueCount / Math.max(per1000, 1)) * 0.5);

  return clamp(score);
}

function measureConciseness(sentences) {
  const avgLen = sentences.reduce((s, sent) => s + sent.split(/\s+/).length, 0) / Math.max(sentences.length, 1);
  if (avgLen < 10) return 9;
  if (avgLen < 14) return 7;
  if (avgLen < 18) return 5;
  if (avgLen < 22) return 3;
  return 2;
}

/**
 * NEW: Measure irreverence — detects anti-establishment, subversive, punk, profane language
 */
function measureIrreverence(words, text) {
  // Profanity and edge (used humorously/branding)
  const profanity = /\b(hell|damn|ass|shit|fuck|crap|suck|screw|piss|bloody|bastard|wtf|omfg|stfu|badass|kick\s?ass|smart\s?ass|hard\s?ass)\b/gi;
  // Anti-establishment / punk / rebellion
  const rebellion = /\b(murder|kill|death|dead|destroy|skull|bones|666|satan|evil|demon|doom|rage|riot|revolt|rebel|punk|metal|anarchy|chaos|break the rules?|screw the|forget the rules?|middle finger|don't give a|zero f[*u]cks?|who cares|rules? are|mainstream)\b/gi;
  // Anti-corporate / subversive
  const antiCorp = /\b(boring|corporate|suit|generic|sellout|basic|vanilla|cookie.cutter|same old|typical|status quo|not your (average|typical|ordinary)|unlike|different|unconventional|disrupt|defy|against)\b/gi;
  // Slang and irreverent casual
  const slang = /\b(ain't|gonna|wanna|y'all|hella|dope|sick|savage|lit|fire|slay|rip|nah|bruh|fam|lowkey|no cap|fr fr|iykyk)\b/gi;
  // ALL CAPS usage (shouting = irreverent energy)
  const capsWords = (text.match(/\b[A-Z]{4,}\b/g) || []).filter((w) => !["THIS", "THAT", "THEY", "THEIR", "HAVE", "FROM", "WITH", "BEEN", "WILL", "YOUR", "HTTP", "HTML", "HTTPS"].includes(w)).length;

  const per1000 = words.length / 1000;
  const profanityCount = (text.match(profanity) || []).length;
  const rebellionCount = (text.match(rebellion) || []).length;
  const antiCorpCount = (text.match(antiCorp) || []).length;
  const slangCount = (text.match(slang) || []).length;

  let score = 3; // default: most brands are conventional
  score += Math.min(3, (profanityCount / Math.max(per1000, 1)) * 2);
  score += Math.min(2.5, (rebellionCount / Math.max(per1000, 1)) * 1.5);
  score += Math.min(1.5, (antiCorpCount / Math.max(per1000, 1)) * 0.8);
  score += Math.min(1, (slangCount / Math.max(per1000, 1)) * 0.5);
  score += Math.min(1, (capsWords / Math.max(per1000, 1)) * 0.2);

  return clamp(score);
}

/**
 * NEW: Measure provocativeness — shock value, bold claims, dark humor, taboo
 */
function measureProvocativeness(words, text, sentences) {
  // Death, violence, darkness (used as branding/humor)
  const darkThemes = /\b(murder|kill|death|dead|die|dying|grave|coffin|skull|skeleton|blood|gore|pain|suffer|torture|poison|toxic|doom|apocalypse|zombie|haunted|creep|nightmare|horror|terror|scream|fear|cursed|wicked|sin|satan|demon|devil|hell|underworld)\b/gi;
  // Shock value / extreme claims
  const shock = /\b(insane|outrageous|unhinged|brutal|savage|ruthless|merciless|relentless|extreme|radical|hardcore|intense|violent|aggressive|furious|rage|maniac|psycho|freak|beast|monster|villain|criminal)\b/gi;
  // Dark humor / irony markers
  const irony = /\b(obviously|clearly|totally|definitely|absolutely|surely|of course|spoiler|plot twist|surprise|actually|technically|literally|ironically)\b/gi;
  // Bold/extreme superlatives
  const extreme = /\b(world'?s? (first|best|worst|most)|ever made|of all time|nothing like|no one else|only brand|the one (true|real)|literally the|unlike anything|never before)\b/gi;
  // Questions used rhetorically
  const rhetoricalQs = sentences.filter((s) => s.endsWith("?") && s.length < 60).length;

  const per1000 = words.length / 1000;
  const darkCount = (text.match(darkThemes) || []).length;
  const shockCount = (text.match(shock) || []).length;
  const ironyCount = (text.match(irony) || []).length;
  const extremeCount = (text.match(extreme) || []).length;

  let score = 2.5; // default: most brands play it safe
  score += Math.min(3, (darkCount / Math.max(per1000, 1)) * 1.5);
  score += Math.min(2, (shockCount / Math.max(per1000, 1)) * 1);
  score += Math.min(1.5, (ironyCount / Math.max(per1000, 1)) * 0.3);
  score += Math.min(1, (extremeCount / Math.max(per1000, 1)) * 2);
  score += Math.min(0.5, (rhetoricalQs / Math.max(sentences.length, 1)) * 5);

  return clamp(score);
}

// ── Vocabulary Analysis ──────────────────────────────────────────

function analyzeVocabulary(words, text) {
  const lower = words.map((w) => w.toLowerCase().replace(/[^a-z'-]/g, "")).filter((w) => w.length > 2);
  const freq = {};
  for (const w of lower) freq[w] = (freq[w] || 0) + 1;

  const STOP_WORDS = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was",
    "one", "our", "out", "has", "had", "his", "how", "its", "may", "new", "now",
    "old", "see", "way", "who", "did", "get", "let", "say", "she", "too", "use",
    "with", "this", "that", "have", "from", "they", "been", "more", "when", "will",
    "each", "make", "like", "than", "them", "then", "what", "your", "about", "which",
    "their", "there", "would", "other", "into", "just", "also", "over", "such",
    "after", "most", "some", "very", "only", "even", "could", "these",
    // E-commerce boilerplate
    "cart", "sold", "stock", "shipping", "checkout", "subscribe", "login",
    "signup", "newsletter", "cookie", "privacy", "terms", "rights", "reserved",
    "menu", "search", "close", "open", "show", "hide", "more", "less",
    "page", "next", "prev", "previous", "back", "home",
  ]);

  const meaningful = Object.entries(freq)
    .filter(([w]) => !STOP_WORDS.has(w) && w.length > 3)
    .sort((a, b) => b[1] - a[1]);

  const powerWords = meaningful.slice(0, 20).map(([w, c]) => ({ word: w, count: c }));

  const uniqueRatio = new Set(lower).size / Math.max(lower.length, 1);

  const jargon = /\b(roi|kpi|saas|b2b|b2c|api|sdk|mvp|ux|ui|crm|erp|gtm|cac|ltv|arr|mrr|cto|ceo|cfo|devops|cicd|agile|scrum)\b/gi;
  const jargonWords = [...new Set((text.match(jargon) || []).map((w) => w.toUpperCase()))];

  // Detect brand-specific signature phrases (3+ word combos that repeat)
  const signaturePhrases = findSignaturePhrases(text);

  return {
    totalWords: words.length,
    uniqueWords: new Set(lower).size,
    vocabularyRichness: Math.round(uniqueRatio * 100) / 100,
    averageWordLength: Math.round((lower.reduce((s, w) => s + w.length, 0) / Math.max(lower.length, 1)) * 10) / 10,
    powerWords,
    jargon: jargonWords,
    signaturePhrases,
  };
}

/**
 * Find repeated multi-word phrases that might be brand signatures.
 */
function findSignaturePhrases(text) {
  const cleaned = text.toLowerCase().replace(/[^a-z\s'-]/g, " ").replace(/\s+/g, " ");
  const words = cleaned.split(" ");
  const phrases = {};

  // Look for 3-5 word phrases
  for (let len = 3; len <= 5; len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(" ");
      if (phrase.length > 8) {
        phrases[phrase] = (phrases[phrase] || 0) + 1;
      }
    }
  }

  // Filter out e-commerce boilerplate phrases
  const boilerplate = /\b(add to cart|sold out|out of stock|free shipping|buy now|shop now|view cart|checkout|sign up|log in|cookie|privacy|terms of|all rights|powered by|subscribe|newsletter|follow us)\b/i;

  return Object.entries(phrases)
    .filter(([phrase, count]) => {
      if (count < 2) return false;
      if (boilerplate.test(phrase)) return false;
      if (/\b(add to|cart|checkout|shipping|sold|select|choose|order|subscribe|account|login|register)\b/i.test(phrase)) return false;
      if (/[àáâãäåèéêëìíîïòóôõöùúûüñçßœæ]/.test(phrase)) return false;
      if (/\b(fran[çc]aise|french|united states|united kingdom|republic of|cfa franc|new zealand|south africa|hong kong|saudi arabia)\b/i.test(phrase)) return false;
      const words = phrase.split(" ");
      if (words.filter(w => w.length <= 2).length >= words.length - 1) return false;
      return true;
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase, count]) => ({ phrase, count }));
}

// ── Structure Analysis ──────────────────────────────────────────

function analyzeStructure(sentences, words) {
  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / Math.max(lengths.length, 1);
  const questions = sentences.filter((s) => s.endsWith("?")).length;
  const exclamations = sentences.filter((s) => s.endsWith("!")).length;
  const imperatives = sentences.filter((s) => /^(get|start|try|build|create|make|join|sign|discover|explore|learn|see|check|read|find|grow|take|use|set|run|open|click|download|buy|shop|grab|order|subscribe|murder|kill|crush|slay|destroy|unleash|dominate|conquer)/i.test(s)).length;

  return {
    averageSentenceLength: Math.round(avg * 10) / 10,
    sentenceCount: sentences.length,
    questionRatio: Math.round((questions / Math.max(sentences.length, 1)) * 100) / 100,
    exclamationRatio: Math.round((exclamations / Math.max(sentences.length, 1)) * 100) / 100,
    imperativeRatio: Math.round((imperatives / Math.max(sentences.length, 1)) * 100) / 100,
    readingLevel: estimateReadingLevel(avg, words),
  };
}

function estimateReadingLevel(avgSentenceLen, words) {
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / Math.max(words.length, 1);
  const score = 0.39 * avgSentenceLen + 11.8 * (avgWordLen / 4.7) - 15.59;
  const grade = Math.round(Math.max(1, Math.min(16, score)));
  if (grade <= 6) return { grade, label: "Elementary" };
  if (grade <= 8) return { grade, label: "Middle School" };
  if (grade <= 10) return { grade, label: "High School" };
  if (grade <= 12) return { grade, label: "College" };
  return { grade, label: "Graduate" };
}

// ── Personality ──────────────────────────────────────────────

function derivePersonality(tone, vocabulary, structure, text) {
  const d = Object.fromEntries(tone.dimensions.map((t) => [t.name, t.score]));

  // Score each archetype by strength of match, then pick top 2-3
  const candidates = [];

  // The Rebel — anti-establishment, punk, irreverent
  const rebelScore = (Math.max(0, d["Conventional ↔ Irreverent"] - 5) * 2) + (Math.max(0, d["Safe ↔ Provocative"] - 4) * 1.5);
  if (rebelScore > 2) candidates.push({ name: "The Rebel", score: rebelScore });

  // The Jester — humor-first, absurdist, entertainer
  const jesterScore = (Math.max(0, d["Serious ↔ Playful"] - 5) * 2) + (Math.max(0, d["Conventional ↔ Irreverent"] - 4) * 1);
  if (jesterScore > 2) candidates.push({ name: "The Jester", score: jesterScore });

  // The Provocateur — shock value, bold, confrontational
  const provocScore = (Math.max(0, d["Safe ↔ Provocative"] - 5) * 3);
  if (provocScore > 3) candidates.push({ name: "The Provocateur", score: provocScore });

  // The Maverick — unconventional, confident, disruptive
  const mavScore = (Math.max(0, d["Conventional ↔ Irreverent"] - 5) * 1.5) + (Math.max(0, d["Passive ↔ Active"] - 5) * 1) + (Math.max(0, d["Corporate ↔ Human"] - 5) * 0.5);
  if (mavScore > 3) candidates.push({ name: "The Maverick", score: mavScore });

  // The Expert — technical, precise, authoritative
  const expertScore = (Math.max(0, 5 - d["Technical ↔ Accessible"]) * 2.5) + (Math.max(0, d["Vague ↔ Specific"] - 5) * 1) + (Math.max(0, 5 - d["Serious ↔ Playful"]) * 0.5);
  if (expertScore > 3) candidates.push({ name: "The Expert", score: expertScore });

  // The Sage — wise, deep vocabulary, specific, authoritative
  const sageScore = (Math.max(0, 5 - d["Technical ↔ Accessible"]) * 1.5) + (vocabulary.vocabularyRichness >= 0.3 ? 2 : 0) + (Math.max(0, d["Vague ↔ Specific"] - 5) * 1.5);
  if (sageScore > 3) candidates.push({ name: "The Sage", score: sageScore });

  // The Friend — warm, casual, human
  const friendScore = (Math.max(0, d["Formal ↔ Casual"] - 5) * 2) + (Math.max(0, d["Corporate ↔ Human"] - 5) * 1.5);
  if (friendScore > 3) candidates.push({ name: "The Friend", score: friendScore });

  // The Coach — imperative, action-oriented, direct
  const coachScore = (structure.imperativeRatio > 0.08 ? 3 : 0) + (Math.max(0, d["Passive ↔ Active"] - 5) * 1);
  if (coachScore > 3) candidates.push({ name: "The Coach", score: coachScore });

  // The Cheerleader — enthusiastic, energetic, excited
  const cheerScore = (Math.max(0, d["Reserved ↔ Enthusiastic"] - 5) * 2.5);
  if (cheerScore > 3) candidates.push({ name: "The Cheerleader", score: cheerScore });

  // The Minimalist — concise, restrained, every-word-earns-its-place
  const minScore = (Math.max(0, d["Long-winded ↔ Concise"] - 5) * 2) + (Math.max(0, 5 - d["Reserved ↔ Enthusiastic"]) * 1);
  if (minScore > 3) candidates.push({ name: "The Minimalist", score: minScore });

  // The Storyteller — human, narrative-driven
  const storyScore = (Math.max(0, d["Corporate ↔ Human"] - 5) * 2) + (Math.max(0, 5 - d["Long-winded ↔ Concise"]) * 1);
  if (storyScore > 3) candidates.push({ name: "The Storyteller", score: storyScore });

  // Sort by score, take top 3
  candidates.sort((a, b) => b.score - a.score);
  const archetypes = candidates.slice(0, 3).map((c) => c.name);
  if (archetypes.length === 0) archetypes.push("The Professional");

  // Traits
  const traits = [];
  if (d["Formal ↔ Casual"] >= 6) traits.push("approachable");
  if (d["Formal ↔ Casual"] <= 4) traits.push("polished");
  if (d["Serious ↔ Playful"] >= 6) traits.push("witty");
  if (d["Serious ↔ Playful"] <= 4) traits.push("serious");
  if (d["Technical ↔ Accessible"] >= 6) traits.push("clear");
  if (d["Technical ↔ Accessible"] <= 4) traits.push("technical");
  if (d["Reserved ↔ Enthusiastic"] >= 6) traits.push("energetic");
  if (d["Reserved ↔ Enthusiastic"] <= 4) traits.push("measured");
  if (d["Corporate ↔ Human"] >= 6) traits.push("warm");
  if (d["Corporate ↔ Human"] <= 4) traits.push("corporate");
  if (d["Long-winded ↔ Concise"] >= 6) traits.push("concise");
  if (d["Long-winded ↔ Concise"] <= 4) traits.push("detailed");
  if (d["Conventional ↔ Irreverent"] >= 6) traits.push("irreverent");
  if (d["Conventional ↔ Irreverent"] <= 3) traits.push("conventional");
  if (d["Safe ↔ Provocative"] >= 6) traits.push("provocative");
  if (d["Safe ↔ Provocative"] >= 7) traits.push("edgy");
  if (d["Serious ↔ Playful"] >= 7 && d["Conventional ↔ Irreverent"] >= 6) traits.push("absurdist");

  return { archetypes, traits };
}

// ── Guidelines ──────────────────────────────────────────────

function generateGuidelines(tone, vocabulary, structure, personality, brand) {
  const d = Object.fromEntries(tone.dimensions.map((t) => [t.name, t.score]));
  const dos = [];
  const donts = [];

  // Formality (but don't conflict with irreverence)
  if (d["Formal ↔ Casual"] >= 6) {
    dos.push("Use contractions (we're, it's, you'll)");
    dos.push("Write like you're talking to a smart friend");
    donts.push("Sound like a legal document");
  } else if (d["Conventional ↔ Irreverent"] >= 6) {
    // Irreverent but not casual in typical ways — their own kind of voice
    dos.push("Write with conviction — direct, punchy, unapologetic");
    donts.push("Sound corporate or sanitized");
  } else {
    dos.push("Maintain professional tone throughout");
    donts.push("Use slang or overly casual language");
  }

  // Playfulness
  if (d["Serious ↔ Playful"] >= 6) {
    dos.push("Inject personality and wit where appropriate");
    dos.push("Use unexpected metaphors or analogies");
    donts.push("Be dry or robotic");
  } else {
    dos.push("Keep messaging focused and substantive");
    donts.push("Try too hard to be funny");
  }

  // Technical
  if (d["Technical ↔ Accessible"] >= 6) {
    dos.push("Explain complex ideas in simple terms");
    dos.push("Use analogies to make concepts relatable");
    donts.push("Hide behind jargon");
  } else {
    dos.push("Use precise technical terminology");
    donts.push("Oversimplify to the point of inaccuracy");
  }

  // Enthusiasm
  if (d["Reserved ↔ Enthusiastic"] >= 6) {
    dos.push("Show genuine excitement about what you're building");
    donts.push("Be monotone or flat");
  } else {
    dos.push("Let the product speak for itself");
    donts.push("Use excessive exclamation points or superlatives");
  }

  // Conciseness
  if (d["Long-winded ↔ Concise"] >= 6) {
    dos.push("Keep sentences short and punchy");
    dos.push("Cut every unnecessary word");
    donts.push("Write paragraphs when a sentence will do");
  }

  // Specificity
  if (d["Vague ↔ Specific"] >= 6) {
    dos.push("Use numbers, data, and concrete examples");
    donts.push("Make vague claims without backing them up");
  }

  // Voice
  if (d["Corporate ↔ Human"] >= 6) {
    dos.push("Use 'you' and 'we' — talk to real humans");
    donts.push("Sound like a press release");
  }

  // NEW: Irreverence
  if (d["Conventional ↔ Irreverent"] >= 6) {
    dos.push("Break conventions — if it feels safe, push harder");
    dos.push("Use slang, profanity, or edge when it fits the brand");
    donts.push("Play it safe or sound corporate");
    donts.push("Apologize for being edgy — own it");
  } else if (d["Conventional ↔ Irreverent"] <= 3) {
    dos.push("Stay within brand-safe territory");
    donts.push("Use profanity, dark humor, or provocative language");
  }

  // NEW: Provocativeness
  if (d["Safe ↔ Provocative"] >= 6) {
    dos.push("Use shock value and bold claims strategically");
    dos.push("Lean into dark humor and absurdity");
    donts.push("Water down the message to avoid offending anyone");
    donts.push("Sound like every other brand");
  } else if (d["Safe ↔ Provocative"] <= 3) {
    dos.push("Keep messaging positive and brand-safe");
    donts.push("Use dark or controversial themes");
  }

  return { dos, donts };
}

// ── AI Prompt ──────────────────────────────────────────────

function generateAIPrompt(brand, personality, tone, vocabulary, structure, text) {
  const d = Object.fromEntries(tone.dimensions.map((t) => [t.name, t.score]));

  const toneDesc = tone.dimensions
    .filter((t) => Math.abs(t.score - 5) >= 1.5)
    .map((t) => {
      const left = t.left || t.name.split(" ↔ ")[0];
      const right = t.right || t.name.split(" ↔ ")[1];
      return t.score >= 6 ? `more ${right.toLowerCase()}` : `more ${left.toLowerCase()}`;
    })
    .join(", ");

  const traitList = personality.traits.slice(0, 6).join(", ");
  const reading = structure.readingLevel.label.toLowerCase();

  // Detect special brand patterns for richer prompts
  const specialPatterns = [];
  
  if (d["Conventional ↔ Irreverent"] >= 6) {
    specialPatterns.push("This brand is irreverent — break rules, use edgy language, be anti-corporate.");
  }
  if (d["Safe ↔ Provocative"] >= 6) {
    specialPatterns.push("This brand uses dark humor, shock value, and provocative themes. Don't sanitize the voice.");
  }
  if (d["Serious ↔ Playful"] >= 7 && d["Conventional ↔ Irreverent"] >= 5) {
    specialPatterns.push("Comedy is core to this brand. Use absurdist humor, irony, and unexpected turns.");
  }

  // Check for death/violence themes used as branding
  const deathBranding = /\b(murder|kill|death|dead|skull|destroy|doom|slay)\b/gi;
  const deathCount = (text.match(deathBranding) || []).length;
  if (deathCount > 5) {
    specialPatterns.push(`This brand weaponizes death/destruction themes as branding. Words like "murder," "death," and "kill" are part of the voice, not mistakes.`);
  }

  // Check for ALL CAPS usage as style
  const capsWords = (text.match(/\b[A-Z]{4,}\b/g) || []).filter((w) => !["THIS", "THAT", "THEY", "THEIR", "HAVE", "FROM", "WITH", "BEEN", "WILL", "YOUR", "HTTP", "HTML", "HTTPS"].includes(w));
  if (capsWords.length > 10) {
    specialPatterns.push("ALL CAPS is part of this brand's visual voice — use it for emphasis and energy.");
  }

  // Signature phrases
  if (vocabulary.signaturePhrases?.length > 0) {
    const phrases = vocabulary.signaturePhrases.slice(0, 3).map((p) => `"${p.phrase}"`).join(", ");
    specialPatterns.push(`Signature phrases to echo: ${phrases}.`);
  }

  const specialBlock = specialPatterns.length
    ? `\n\nBrand-specific patterns:\n${specialPatterns.map((p) => `- ${p}`).join("\n")}`
    : "";

  return `You are writing as ${brand}. Your voice is ${traitList}.

Tone: ${toneDesc || "balanced across dimensions"}.
Reading level: ${reading} (avg ${structure.averageSentenceLength} words/sentence).
${d["Formal ↔ Casual"] >= 6 ? "Use contractions naturally." : "Avoid contractions."}
${d["Serious ↔ Playful"] >= 6 ? "Add personality and wit." : "Stay focused and substantive."}
${d["Reserved ↔ Enthusiastic"] >= 6 ? "Show enthusiasm without being over the top." : "Be measured and confident."}
${d["Corporate ↔ Human"] >= 6 ? "Write like a human, not a corporation." : "Maintain professional polish."}
${vocabulary.powerWords.length ? `Key vocabulary: ${vocabulary.powerWords.slice(0, 10).map((w) => w.word).join(", ")}.` : ""}
${personality.archetypes.length ? `Channel the personality of: ${personality.archetypes.join(", ")}.` : ""}${specialBlock}`;
}

// ── Summary ──────────────────────────────────────────────

function generateSummary(brand, personality, tone) {
  const traits = personality.traits.slice(0, 5).join(", ");
  const archetype = personality.archetypes.slice(0, 2).join(" + ") || "The Professional";
  const dominant = tone.dominant.map((d) => {
    const left = d.left || d.name.split(" ↔ ")[0];
    const right = d.right || d.name.split(" ↔ ")[1];
    return d.score >= 6 ? right : left;
  }).join(", ");
  return `${brand} speaks as ${archetype} — ${traits}. ${dominant}.`;
}

function clamp(v, min = 1, max = 10) {
  return Math.round(Math.max(min, Math.min(max, v)) * 10) / 10;
}
