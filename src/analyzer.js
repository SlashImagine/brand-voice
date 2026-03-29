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
  const voiceDoc = generateVoiceDoc(brand, url, personality, tone, vocabulary, structure, guidelines, aiPrompt);
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
    voiceDoc,
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
    { name: "Formal ↔ Casual",         score: measureFormality(words, text) },
    { name: "Serious ↔ Playful",        score: measurePlayfulness(words, text) },
    { name: "Technical ↔ Accessible",   score: measureAccessibility(words, text) },
    { name: "Reserved ↔ Enthusiastic",  score: measureEnthusiasm(sentences, text) },
    { name: "Corporate ↔ Human",        score: measureHumanness(words, text) },
    { name: "Passive ↔ Active",         score: measureActiveVoice(sentences) },
    { name: "Vague ↔ Specific",         score: measureSpecificity(words, text) },
    { name: "Long-winded ↔ Concise",    score: measureConciseness(sentences) },
    { name: "Earnest ↔ Irreverent",     score: measureIrreverence(words, text) },
    { name: "Dry ↔ Humorous",           score: measureHumor(words, sentences, text) },
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
  score += Math.min(2, ((text.match(playful) || []).length) / Math.max(per1000, 1) * 0.5);
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
  if (avgLen < 10) return 9;
  if (avgLen < 14) return 7;
  if (avgLen < 18) return 5;
  if (avgLen < 22) return 3;
  return 2;
}

function measureIrreverence(words, text) {
  // Death/darkness language — signals anti-establishment or edgy brand voice
  const dark = /\b(death|dead|kill|murder|destroy|doom|chaos|evil|curse|damn|hell|skull|blood|poison|toxic|monster|beast|savage|brutal|carnage|mayhem|wrath|plague|slaughter)\b/gi;
  // Anti-corporate language — brands that position against the establishment
  const antiCorp = /\b(corporate|sellout|mainstream|fake|plastic|pollution|evil empire|machine|conform|sheep|drone|clone|establishment|status quo)\b/gi;
  // Punk/counter-culture signals
  const punk = /\b(punk|metal|hardcore|underground|rebel|outlaw|renegade|revolution|resistance|fight|battle|riot|rage|uprising|defy|refuse|reject)\b/gi;
  // Provocateur language
  const provoke = /\b(murder your|kill your|destroy your|murder the|death to|war on|enemy|weapon|arsenal|ammunition|combat|conquer|defeat)\b/gi;

  const darkCount = (text.match(dark) || []).length;
  const antiCorpCount = (text.match(antiCorp) || []).length;
  const punkCount = (text.match(punk) || []).length;
  const provokeCount = (text.match(provoke) || []).length;
  const per1000 = words.length / 1000;

  let score = 1;
  score += Math.min(4, (darkCount / Math.max(per1000, 1)) * 2.5);
  score += Math.min(3, (antiCorpCount / Math.max(per1000, 1)) * 2);
  score += Math.min(2, (punkCount / Math.max(per1000, 1)) * 1.5);
  score += Math.min(2, provokeCount * 1.5);

  return clamp(score);
}

function measureHumor(words, sentences, text) {
  // Absurdist / exaggerated copy signals
  const absurd = /\b(insane|insanely|ridiculous|absurd|bonkers|nuts|wild|unhinged|completely|utterly|absolutely|pure|total|literally|honestly|genuinely|obviously)\b/gi;
  // Self-aware / meta language
  const meta = /\b(yes really|we mean it|no seriously|actually|turns out|plot twist|spoiler|surprise|fun fact|true story|believe it or not)\b/gi;
  // Rhetorical / punchy questions  
  const rhetorical = sentences.filter(s => s.endsWith("?") && s.split(/\s+/).length < 8).length;
  // Short punchy fragments (humor signal — comedic timing)
  const punchyFragments = sentences.filter(s => {
    const wc = s.split(/\s+/).length;
    return wc <= 4 && wc >= 1;
  }).length;
  // Sarcasm markers
  const sarcasm = /\b(obviously|naturally|of course|because obviously|as if|right|sure|totally|definitely|absolutely|perfectly normal|completely normal)\b/gi;

  const absurdCount = (text.match(absurd) || []).length;
  const metaCount = (text.match(meta) || []).length;
  const sarcasmCount = (text.match(sarcasm) || []).length;
  const per1000 = words.length / 1000;

  let score = 3;
  score += Math.min(2.5, (absurdCount / Math.max(per1000, 1)) * 0.5);
  score += Math.min(2, metaCount * 0.4);
  score += Math.min(1.5, (rhetorical / Math.max(sentences.length, 1)) * 15);
  score += Math.min(1, (punchyFragments / Math.max(sentences.length, 1)) * 8);
  score += Math.min(1.5, (sarcasmCount / Math.max(per1000, 1)) * 0.3);

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
  ]);

  const meaningful = Object.entries(freq)
    .filter(([w]) => !STOP_WORDS.has(w) && w.length > 3)
    .sort((a, b) => b[1] - a[1]);

  const powerWords = meaningful.slice(0, 20).map(([w, c]) => ({ word: w, count: c }));
  const uniqueRatio = new Set(lower).size / Math.max(lower.length, 1);

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
  const imperatives = sentences.filter((s) => /^(get|start|try|build|create|make|join|sign|discover|explore|learn|see|check|read|find|grow|take|use|set|run|open|click|download|murder|kill|destroy|fight)\b/i.test(s)).length;

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

function derivePersonality(tone, vocabulary, structure) {
  const d = Object.fromEntries(tone.dimensions.map((t) => [t.name, t.score]));

  const irreverenceScore = d["Earnest ↔ Irreverent"] || 1;
  const humorScore = d["Dry ↔ Humorous"] || 3;

  const archetypes = [];

  // Edgy / counter-culture archetypes (check first — these are rarer and more distinctive)
  if (irreverenceScore >= 7) archetypes.push("The Outlaw");
  if (irreverenceScore >= 5) archetypes.push("The Rebel");
  if (irreverenceScore >= 5 && humorScore >= 5) archetypes.push("The Anti-Hero");
  if (humorScore >= 6) archetypes.push("The Jester");

  // Standard archetypes
  if (d["Formal ↔ Casual"] >= 7 && d["Serious ↔ Playful"] >= 6) {
    archetypes.push("The Friend");
  } else if (d["Formal ↔ Casual"] <= 4 && d["Technical ↔ Accessible"] <= 4) {
    archetypes.push("The Expert");
  }

  if (d["Reserved ↔ Enthusiastic"] >= 7) archetypes.push("The Cheerleader");
  if (d["Corporate ↔ Human"] >= 7) archetypes.push("The Storyteller");
  if (d["Vague ↔ Specific"] >= 7 && irreverenceScore < 5) archetypes.push("The Analyst");
  if (structure.imperativeRatio > 0.1) archetypes.push("The Coach");
  if (d["Long-winded ↔ Concise"] >= 7 && archetypes.length < 2) archetypes.push("The Minimalist");
  if (d["Passive ↔ Active"] >= 7 && archetypes.length < 2) archetypes.push("The Doer");

  if (archetypes.length === 0) archetypes.push("The Professional");

  const traits = [];
  // Irreverence traits first — most distinctive
  if (irreverenceScore >= 7) traits.push("provocative");
  if (irreverenceScore >= 5) traits.push("irreverent");
  if (humorScore >= 6) traits.push("witty");
  if (humorScore >= 7) traits.push("absurdist");

  // Standard traits
  if (d["Formal ↔ Casual"] >= 6) traits.push("approachable");
  if (d["Formal ↔ Casual"] <= 4) traits.push("polished");
  if (d["Serious ↔ Playful"] >= 6 && humorScore < 6) traits.push("playful");
  if (d["Serious ↔ Playful"] <= 4 && irreverenceScore < 5) traits.push("serious");
  if (d["Technical ↔ Accessible"] >= 6) traits.push("clear");
  if (d["Technical ↔ Accessible"] <= 4) traits.push("technical");
  if (d["Reserved ↔ Enthusiastic"] >= 6) traits.push("energetic");
  if (d["Reserved ↔ Enthusiastic"] <= 4 && irreverenceScore < 5) traits.push("measured");
  if (d["Corporate ↔ Human"] >= 6) traits.push("warm");
  if (d["Corporate ↔ Human"] <= 4) traits.push("corporate");
  if (d["Long-winded ↔ Concise"] >= 6) traits.push("direct");
  if (d["Long-winded ↔ Concise"] <= 4) traits.push("detailed");
  if (d["Passive ↔ Active"] >= 7) traits.push("bold");

  return { archetypes, traits };
}

// ── Guidelines ──────────────────────────────────────────────

function generateGuidelines(tone, vocabulary, structure, personality, brand) {
  const d = Object.fromEntries(tone.dimensions.map((t) => [t.name, t.score]));
  const dos = [];
  const donts = [];

  const irreverenceScore = d["Earnest ↔ Irreverent"] || 1;
  const humorScore = d["Dry ↔ Humorous"] || 3;

  // Irreverence / edginess guidelines
  if (irreverenceScore >= 6) {
    dos.push("Lean into the dark, unexpected, or provocative — that's the brand");
    dos.push("Use death, danger, and dramatic language intentionally and with confidence");
    dos.push("Mock corporate speak — it's part of the positioning");
    donts.push("Sanitize or soften the edge — that kills the voice");
    donts.push("Sound like a normal beverage brand");
    donts.push("Use earnest, sincere marketing language without irony");
  }

  // Humor guidelines
  if (humorScore >= 6) {
    dos.push("Use absurdist logic and treat ridiculous things with total seriousness");
    dos.push("Short punchy lines for comedic timing — let the joke breathe");
    donts.push("Explain the joke");
    donts.push("Force humor — the funniest lines come from complete commitment");
  }

  // Formality
  if (d["Formal ↔ Casual"] >= 6) {
    dos.push("Use contractions (we're, it's, you'll)");
    dos.push("Write like you're talking to a smart friend");
    donts.push("Sound like a legal document");
  } else if (irreverenceScore < 5) {
    dos.push("Maintain professional tone throughout");
    donts.push("Use slang or overly casual language");
  }

  // Technical
  if (d["Technical ↔ Accessible"] >= 6) {
    dos.push("Explain complex ideas in simple terms");
    donts.push("Hide behind jargon");
  } else {
    dos.push("Use precise technical terminology");
    donts.push("Oversimplify to the point of inaccuracy");
  }

  // Conciseness
  if (d["Long-winded ↔ Concise"] >= 6) {
    dos.push("Keep sentences short and punchy — cut every unnecessary word");
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
  const irreverenceScore = d["Earnest ↔ Irreverent"] || 1;
  const humorScore = d["Dry ↔ Humorous"] || 3;

  const toneDesc = tone.dimensions
    .filter((t) => Math.abs(t.score - 5) >= 1.5)
    .map((t) => {
      const [low, high] = t.name.split(" ↔ ");
      return t.score >= 6 ? `more ${high.toLowerCase()}` : `more ${low.toLowerCase()}`;
    })
    .join(", ");

  const traitList = personality.traits.slice(0, 5).join(", ");
  const reading = structure.readingLevel.label.toLowerCase();
  const archetypeList = personality.archetypes.join(", ");

  let irreverenceInstructions = "";
  if (irreverenceScore >= 6) {
    irreverenceInstructions = `
You are allowed — encouraged — to use dark, provocative, death-adjacent language. That is NOT a mistake; it IS the brand.
Treat death, danger, and the macabre as normal, even desirable. Keep a straight face — the humor comes from total commitment.
Never sanitize or soften the edge. Corporate-speak is the enemy.`;
  }

  let humorInstructions = "";
  if (humorScore >= 6) {
    humorInstructions = `
Use absurdist logic: treat ridiculous premises with complete seriousness.
Short punchy fragments create comedic timing. One-word sentences are fine.
Never explain the joke.`;
  }

  return `You are writing copy as ${brand}.

## Voice
Archetypes: ${archetypeList}
Traits: ${traitList}
Tone: ${toneDesc || "balanced across all dimensions"}
Reading level: ${reading} (avg ${structure.averageSentenceLength} words/sentence)
${irreverenceInstructions}${humorInstructions}
## Writing Rules
${d["Formal ↔ Casual"] >= 6 ? "- Use contractions naturally." : "- Avoid contractions."}
${d["Serious ↔ Playful"] >= 6 || humorScore >= 6 ? "- Add personality. Wit is welcome." : "- Stay focused and substantive."}
${d["Reserved ↔ Enthusiastic"] >= 6 ? "- Show genuine enthusiasm without being over the top." : "- Be measured and confident."}
${d["Corporate ↔ Human"] >= 6 ? "- Write like a human, not a corporation." : "- Maintain professional polish."}
${d["Long-winded ↔ Concise"] >= 6 ? "- Cut every unnecessary word. Sentences should earn their length." : ""}
${vocabulary.powerWords.length ? `\n## Vocabulary\nUse these words naturally (they define the brand lexicon):\n${vocabulary.powerWords.slice(0, 12).map((w) => w.word).join(", ")}` : ""}`;
}

// ── VOICE.md Document ──────────────────────────────────────────

/**
 * Generate a deployable VOICE.md — the brand's operating system for AI.
 * Drop this file into any project and AI tools will write in this brand's voice.
 */
function generateVoiceDoc(brand, url, personality, tone, vocabulary, structure, guidelines, aiPrompt) {
  const d = Object.fromEntries(tone.dimensions.map((t) => [t.name, t.score]));
  const irreverenceScore = d["Earnest ↔ Irreverent"] || 1;
  const humorScore = d["Dry ↔ Humorous"] || 3;

  const archetypeList = personality.archetypes.join(" · ");
  const traitList = personality.traits.join(", ");
  const topPowerWords = vocabulary.powerWords.slice(0, 20).map(w => w.word).join(", ");
  const topDimensions = tone.dimensions
    .filter(t => Math.abs(t.score - 5) >= 1.5)
    .map(t => {
      const [low, high] = t.name.split(" ↔ ");
      const label = t.score >= 6 ? high : low;
      return `${label} (${t.score}/10)`;
    })
    .join(", ");

  const toneTable = tone.dimensions
    .map(t => {
      const [low, high] = t.name.split(" ↔ ");
      const bar = "█".repeat(Math.round(t.score)) + "░".repeat(10 - Math.round(t.score));
      return `| ${low.padEnd(14)} ${bar} ${high.padEnd(14)} | ${t.score}/10 |`;
    })
    .join("\n");

  const dosFormatted = guidelines.dos.map(d => `- ${d}`).join("\n");
  const dontsFormatted = guidelines.donts.map(d => `- ${d}`).join("\n");

  // Generate example copy in this voice
  const exampleHooks = generateExampleHooks(brand, personality, tone, vocabulary);

  return `# ${brand} — VOICE.md
> The brand voice operating system. Drop this file into any AI tool, agent, or project.
> Every word you write should be indistinguishable from ${brand}'s own copy.

**Source:** ${url}
**Generated by:** voiceprint

---

## The One-Line Brief

${generateOneLiner(brand, personality, tone)}

---

## Who ${brand} Sounds Like

**Archetypes:** ${archetypeList}
**Core traits:** ${traitList}
**Defining quality:** ${personality.archetypes[0] || "The Professional"}

${irreverenceScore >= 6 ? `> ⚡ This is a high-irreverence brand. The edge is intentional. Do not soften it.\n` : ""}${humorScore >= 6 ? `> 😈 Humor is structural, not decorative. It comes from total commitment to the bit.\n` : ""}
---

## Tone Spectrum

| Dimension | Score |
|-----------|-------|
${toneTable}

**Dominant tones:** ${topDimensions || "Balanced"}

---

## Vocabulary

**Reading level:** ${structure.readingLevel.label} (Grade ${structure.readingLevel.grade}) · avg ${structure.averageSentenceLength} words/sentence
**Brand lexicon (use these naturally):**
\`${topPowerWords}\`
${vocabulary.jargon.length ? `\n**Industry terms used:** ${vocabulary.jargon.join(", ")}` : ""}

---

## Writing Rules

### ✅ Always
${dosFormatted}

### ❌ Never
${dontsFormatted}

---

## Sentence Rhythm

- Average sentence: **${structure.averageSentenceLength} words**
- Reading level: **${structure.readingLevel.label}**
- Questions: **${Math.round(structure.questionRatio * 100)}%** of sentences
- Exclamations: **${Math.round(structure.exclamationRatio * 100)}%** of sentences
- Imperatives: **${Math.round(structure.imperativeRatio * 100)}%** of sentences
${irreverenceScore >= 5 ? "\n> Short sentences hit harder. Use them for impact. One word can be enough.\n" : ""}
---

## Example Copy (in this voice)

${exampleHooks}

---

## System Prompt

Copy-paste this into ChatGPT, Claude, or any AI tool:

\`\`\`
${aiPrompt}
\`\`\`

---

## Quick Reference Card

| What to do | Why |
|-----------|-----|
| Read this file first | Sets the entire voice |
| Match the vocabulary | Power words = brand fingerprint |
| Match the rhythm | ${structure.averageSentenceLength} words avg. Count your sentences. |
| ${personality.archetypes[0] === "The Rebel" || personality.archetypes[0] === "The Outlaw" ? "Embrace the dark / irreverent angle" : "Stay on archetype"} | ${personality.archetypes[0] === "The Rebel" || personality.archetypes[0] === "The Outlaw" ? "That IS the brand" : "Consistency builds recognition"} |
| When in doubt | Ask: would ${brand} actually say this? |

---

*Generated by [voiceprint](https://github.com/SlashImagine/brand-voice) · MIT License*
`;
}

function generateOneLiner(brand, personality, tone) {
  const d = Object.fromEntries(tone.dimensions.map((t) => [t.name, t.score]));
  const irreverenceScore = d["Earnest ↔ Irreverent"] || 1;
  const archetype = personality.archetypes[0] || "The Professional";
  const traits = personality.traits.slice(0, 3).join(", ");

  if (irreverenceScore >= 7) {
    return `${brand} is a provocateur. It speaks in the voice of ${archetype} — ${traits}. It uses darkness and irreverence as features, not bugs.`;
  } else if (irreverenceScore >= 5) {
    return `${brand} is a rebel with a cause. It sounds like ${archetype} — ${traits}. It bends the rules of category convention without breaking them.`;
  } else if (d["Corporate ↔ Human"] >= 7) {
    return `${brand} sounds like a brilliant friend who happens to be an expert. ${archetype} energy — ${traits}. Never corporate. Always human.`;
  } else {
    return `${brand} writes as ${archetype} — ${traits}. Clear, consistent, and unmistakably itself.`;
  }
}

function generateExampleHooks(brand, personality, tone, vocabulary) {
  const d = Object.fromEntries(tone.dimensions.map((t) => [t.name, t.score]));
  const irreverenceScore = d["Earnest ↔ Irreverent"] || 1;
  const humorScore = d["Dry ↔ Humorous"] || 3;
  const topWords = vocabulary.powerWords.slice(0, 5).map(w => w.word);

  if (irreverenceScore >= 6) {
    return `Here's how ${brand} would write a product line:

> "${topWords[0] ? topWords[0].charAt(0).toUpperCase() + topWords[0].slice(1) : "Death"}. But make it refreshing."

> "Warning: contains ${topWords[1] || "water"}. Side effects include being slightly less dead."

> "For people who take hydration as seriously as we take everything else. Which is to say: not very."`;
  } else if (humorScore >= 6) {
    return `Here's how ${brand} would write a product line:

> "It's ${topWords[0] || "this"}. You know what it is. Just buy it."

> "Made for people who have better things to do than read product descriptions."

> "Does exactly what it says. Nothing more. Nothing less. Surprisingly rare."`;
  } else if (d["Corporate ↔ Human"] >= 7) {
    return `Here's how ${brand} would write a product line:

> "We built this because we needed it and it didn't exist. You're welcome."

> "Some teams. A lot of ${topWords[0] || "work"}. The thing you've been looking for."

> "Here's the honest version: [what it does, why it matters, nothing extra]."`;
  } else {
    return `Here's how ${brand} would write a product line:

> "The ${topWords[0] || "product"} that [specific benefit]. [Proof point]. [CTA]."

> "Built for [specific person] who needs [specific outcome]."

> "[Feature] that [benefit] without [common tradeoff]."`;
  }
}

// ── Summary ──────────────────────────────────────────────

function generateSummary(brand, personality, tone) {
  const d = Object.fromEntries(tone.dimensions.map((t) => [t.name, t.score]));
  const irreverenceScore = d["Earnest ↔ Irreverent"] || 1;
  const traits = personality.traits.slice(0, 4).join(", ");
  const archetype = personality.archetypes[0] || "The Professional";

  const verb = irreverenceScore >= 7 ? "fights like"
    : irreverenceScore >= 5 ? "speaks as"
    : d["Corporate ↔ Human"] >= 7 ? "connects as"
    : "presents as";

  const dominant = tone.dominant.map((d) => {
    const [low, high] = d.name.split(" ↔ ");
    return d.score >= 6 ? high : low;
  }).join(", ");

  return `${brand} ${verb} ${archetype} — ${traits}. ${dominant}.`;
}

function clamp(v, min = 1, max = 10) {
  return Math.round(Math.max(min, Math.min(max, v)) * 10) / 10;
}
