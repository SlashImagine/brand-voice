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

  const allText = pages.map((p) => p.text).join(" ");
  const brand = extractBrandName(pages, url);

  const sentences = splitSentences(allText);
  const words = allText.split(/\s+/).filter(Boolean);

  const tone = analyzeTone(sentences, words, allText);
  const vocabulary = analyzeVocabulary(words, allText);
  const structure = analyzeStructure(sentences, words);
  const personality = derivePersonality(tone, vocabulary, structure);
  const guidelines = generateGuidelines(tone, vocabulary, structure, personality, brand);
  const aiPrompt = generateAIPrompt(brand, personality, tone, vocabulary, structure);
  const summary = generateSummary(brand, personality, tone);

  return {
    brand,
    url,
    pagesAnalyzed: pages.length,
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
  // Try to extract from title
  if (pages[0]?.title) {
    const title = pages[0].title;
    // Common patterns: "Brand - Tagline", "Brand | Tagline", "Brand: Tagline"
    const parts = title.split(/\s*[|–—:]\s*/);
    if (parts[0] && parts[0].length < 30) return parts[0].trim();
  }
  // Fallback to domain
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
    { name: "Formal ↔ Casual", score: measureFormality(words, text) },
    { name: "Serious ↔ Playful", score: measurePlayfulness(words, text) },
    { name: "Technical ↔ Accessible", score: measureAccessibility(words, text) },
    { name: "Reserved ↔ Enthusiastic", score: measureEnthusiasm(sentences, text) },
    { name: "Corporate ↔ Human", score: measureHumanness(words, text) },
    { name: "Passive ↔ Active", score: measureActiveVoice(sentences) },
    { name: "Vague ↔ Specific", score: measureSpecificity(words, text) },
    { name: "Long-winded ↔ Concise", score: measureConciseness(sentences) },
  ];

  return {
    dimensions,
    dominant: dimensions.slice().sort((a, b) => Math.abs(b.score - 5) - Math.abs(a.score - 5)).slice(0, 3),
  };
}

function measureFormality(words, text) {
  const casual = /\b(hey|yeah|cool|awesome|gonna|wanna|gotta|stuff|things|kinda|pretty|super|totally|nope|yep|ok|okay)\b/gi;
  const formal = /\b(therefore|furthermore|consequently|regarding|pursuant|hereby|thereof|whereas|nonetheless|henceforth)\b/gi;
  const contractions = /\b(can't|won't|isn't|aren't|doesn't|don't|haven't|hasn't|wouldn't|shouldn't|couldn't|it's|we're|they're|you're|we've|I'm|let's)\b/gi;

  const casualCount = (text.match(casual) || []).length;
  const formalCount = (text.match(formal) || []).length;
  const contractionCount = (text.match(contractions) || []).length;
  const per1000 = words.length / 1000;

  let score = 5;
  score += Math.min(2, (casualCount / Math.max(per1000, 1)) * 0.5);
  score += Math.min(1.5, (contractionCount / Math.max(per1000, 1)) * 0.2);
  score -= Math.min(2, (formalCount / Math.max(per1000, 1)) * 1);

  return clamp(score);
}

function measurePlayfulness(words, text) {
  const playful = /\b(fun|love|amazing|wow|magic|delight|spark|joy|brilliant|wild|crazy|epic)\b/gi;
  const emojis = text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu) || [];
  const exclamations = (text.match(/!/g) || []).length;
  const per1000 = words.length / 1000;

  let score = 4;
  score += Math.min(2, (playful.length || (text.match(playful) || []).length) / Math.max(per1000, 1) * 0.5);
  score += Math.min(1, emojis.length / Math.max(per1000, 1) * 0.5);
  score += Math.min(1.5, exclamations / Math.max(per1000, 1) * 0.1);

  return clamp(score);
}

function measureAccessibility(words, text) {
  const technical = /\b(api|sdk|infrastructure|architecture|implementation|configuration|deployment|integration|endpoint|middleware|scalable|enterprise|leverage|utilize)\b/gi;
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
  const superlatives = /\b(best|greatest|fastest|easiest|most powerful|incredible|unbelievable|revolutionary|game-changing|extraordinary)\b/gi;
  const supCount = (text.match(superlatives) || []).length;

  let score = 4;
  score += Math.min(2.5, (exclamations / Math.max(sentences.length, 1)) * 10);
  score += Math.min(2, supCount / Math.max(sentences.length / 50, 1) * 0.5);

  return clamp(score);
}

function measureHumanness(words, text) {
  const corporate = /\b(synergy|leverage|utilize|optimize|streamline|solutions|ecosystem|paradigm|stakeholder|deliverable|actionable|best-in-class|value-add|bandwidth|circle back)\b/gi;
  const human = /\b(you|your|we|our|us|people|team|story|believe|care|help|love|share|together|community)\b/gi;
  const per1000 = words.length / 1000;

  const corpCount = (text.match(corporate) || []).length;
  const humanCount = (text.match(human) || []).length;

  let score = 5;
  score += Math.min(2.5, (humanCount / Math.max(per1000, 1)) * 0.1);
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
  // Short sentences = more concise
  if (avgLen < 10) return 9;
  if (avgLen < 14) return 7;
  if (avgLen < 18) return 5;
  if (avgLen < 22) return 3;
  return 2;
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
  ]);

  const meaningful = Object.entries(freq)
    .filter(([w]) => !STOP_WORDS.has(w) && w.length > 3)
    .sort((a, b) => b[1] - a[1]);

  const powerWords = meaningful.slice(0, 20).map(([w, c]) => ({ word: w, count: c }));

  // Unique word ratio
  const uniqueRatio = new Set(lower).size / Math.max(lower.length, 1);

  // Jargon detection
  const jargon = /\b(roi|kpi|saas|b2b|b2c|api|sdk|mvp|ux|ui|crm|erp|gtm|cac|ltv|arr|mrr|cto|ceo|cfo|devops|cicd|agile|scrum)\b/gi;
  const jargonWords = [...new Set((text.match(jargon) || []).map((w) => w.toUpperCase()))];

  return {
    totalWords: words.length,
    uniqueWords: new Set(lower).size,
    vocabularyRichness: Math.round(uniqueRatio * 100) / 100,
    averageWordLength: Math.round((lower.reduce((s, w) => s + w.length, 0) / Math.max(lower.length, 1)) * 10) / 10,
    powerWords,
    jargon: jargonWords,
  };
}

// ── Structure Analysis ──────────────────────────────────────────

function analyzeStructure(sentences, words) {
  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / Math.max(lengths.length, 1);
  const questions = sentences.filter((s) => s.endsWith("?")).length;
  const exclamations = sentences.filter((s) => s.endsWith("!")).length;
  const imperatives = sentences.filter((s) => /^(get|start|try|build|create|make|join|sign|discover|explore|learn|see|check|read|find|grow|take|use|set|run|open|click|download)\b/i.test(s)).length;

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
  // Simplified readability approximation
  const score = 0.39 * avgSentenceLen + 11.8 * (avgWordLen / 4.7) - 15.59;
  const grade = Math.round(Math.max(1, Math.min(16, score)));
  if (grade <= 6) return { grade, label: "Elementary" };
  if (grade <= 8) return { grade, label: "Middle School" };
  if (grade <= 10) return { grade, label: "High School" };
  if (grade <= 12) return { grade, label: "College" };
  return { grade, label: "Graduate" };
}

// ── Personality ──────────────────────────────────────────────

function derivePersonality(tone, vocabulary, structure) {
  const d = Object.fromEntries(tone.dimensions.map((t) => [t.name, t.score]));

  const archetypes = [];

  if (d["Formal ↔ Casual"] >= 7 && d["Serious ↔ Playful"] >= 6) {
    archetypes.push("The Friend");
  } else if (d["Formal ↔ Casual"] <= 4 && d["Technical ↔ Accessible"] <= 4) {
    archetypes.push("The Expert");
  }

  if (d["Reserved ↔ Enthusiastic"] >= 7) archetypes.push("The Cheerleader");
  if (d["Corporate ↔ Human"] >= 7) archetypes.push("The Storyteller");
  if (d["Vague ↔ Specific"] >= 7) archetypes.push("The Analyst");
  if (structure.imperativeRatio > 0.1) archetypes.push("The Coach");
  if (d["Long-winded ↔ Concise"] >= 7) archetypes.push("The Minimalist");
  if (d["Passive ↔ Active"] >= 7) archetypes.push("The Doer");

  if (archetypes.length === 0) archetypes.push("The Professional");

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

  return { archetypes, traits };
}

// ── Guidelines ──────────────────────────────────────────────

function generateGuidelines(tone, vocabulary, structure, personality, brand) {
  const d = Object.fromEntries(tone.dimensions.map((t) => [t.name, t.score]));
  const dos = [];
  const donts = [];

  // Formality
  if (d["Formal ↔ Casual"] >= 6) {
    dos.push("Use contractions (we're, it's, you'll)");
    dos.push("Write like you're talking to a smart friend");
    donts.push("Sound like a legal document");
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

  return { dos, donts };
}

// ── AI Prompt ──────────────────────────────────────────────

function generateAIPrompt(brand, personality, tone, vocabulary, structure) {
  const d = Object.fromEntries(tone.dimensions.map((t) => [t.name, t.score]));

  const toneDesc = tone.dimensions
    .filter((t) => Math.abs(t.score - 5) >= 1.5)
    .map((t) => {
      const [low, high] = t.name.split(" ↔ ");
      return t.score >= 6 ? `more ${high.toLowerCase()}` : `more ${low.toLowerCase()}`;
    })
    .join(", ");

  const traitList = personality.traits.slice(0, 5).join(", ");
  const reading = structure.readingLevel.label.toLowerCase();

  return `You are writing as ${brand}. Your voice is ${traitList}.

Tone: ${toneDesc}.
Reading level: ${reading} (avg ${structure.averageSentenceLength} words/sentence).
${d["Formal ↔ Casual"] >= 6 ? "Use contractions naturally." : "Avoid contractions."}
${d["Serious ↔ Playful"] >= 6 ? "Add personality and wit." : "Stay focused and substantive."}
${d["Reserved ↔ Enthusiastic"] >= 6 ? "Show enthusiasm without being over the top." : "Be measured and confident."}
${d["Corporate ↔ Human"] >= 6 ? "Write like a human, not a corporation." : "Maintain professional polish."}
${vocabulary.powerWords.length ? `Key vocabulary: ${vocabulary.powerWords.slice(0, 10).map((w) => w.word).join(", ")}.` : ""}
${personality.archetypes.length ? `Channel the personality of: ${personality.archetypes.join(", ")}.` : ""}`;
}

// ── Summary ──────────────────────────────────────────────

function generateSummary(brand, personality, tone) {
  const traits = personality.traits.slice(0, 4).join(", ");
  const archetype = personality.archetypes[0] || "The Professional";
  return `${brand} speaks as ${archetype} — ${traits}. ${tone.dominant.map((d) => {
    const [low, high] = d.name.split(" ↔ ");
    return d.score >= 6 ? high : low;
  }).join(", ")}.`;
}

function clamp(v, min = 1, max = 10) {
  return Math.round(Math.max(min, Math.min(max, v)) * 10) / 10;
}
