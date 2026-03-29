# 🎙️ brand-voice

**Reverse-engineer any brand's voice from their website. Get an AI-ready brand voice guide in seconds.**

Every marketer using AI to write copy faces the same problem: the output sounds generic. The fix is a brand voice guide — but building one manually takes hours of reading, analyzing, and documenting.

`brand-voice` does it in seconds. Point it at any URL, and it crawls the site, analyzes the writing patterns, and produces a complete brand voice profile with tone dimensions, personality archetypes, vocabulary DNA, do/don't guidelines, and a **copy-paste AI prompt** that makes ChatGPT, Claude, or any LLM write in that brand's voice.

Zero API keys. Zero dependencies. Just `npx` and go.

## Quick Start

```bash
npx brand-voice https://stripe.com
```

That's it. You'll get a full brand voice profile printed to your terminal.

## What You Get

### 🎯 Tone Spectrum (8 dimensions, scored 1–10)

| Dimension | Score |
|-----------|-------|
| Formal ◼◼◼◼◼◻◻◻◻◻ Casual | 5.2/10 |
| Serious ◼◼◼◼◻◻◻◻◻◻ Playful | 4.2/10 |
| Technical ◼◼◼◻◻◻◻◻◻◻ Accessible | 2.5/10 |
| Reserved ◼◼◼◼◼◻◻◻◻◻ Enthusiastic | 4.5/10 |
| Corporate ◼◼◼◼◼◼◻◻◻◻ Human | 6.2/10 |
| Passive ◼◼◼◼◼◼◼◻◻◻ Active | 6.8/10 |

### 🧬 Personality Archetypes

Automatically classified as The Friend, The Expert, The Coach, The Storyteller, The Analyst, The Minimalist, The Doer, or The Cheerleader.

### 📊 Vocabulary DNA

Power words, jargon detection, vocabulary richness score, and average word length.

### ✅ Do / ❌ Don't Guidelines

Actionable writing rules derived directly from the brand's actual patterns.

### 🤖 AI Prompt (Copy & Paste)

A ready-to-use system prompt that makes any LLM write in the brand's voice:

```
You are writing as Stripe. Your voice is technical, warm, detailed.
Tone: more technical, more active, more specific.
Reading level: middle school (avg 21 words/sentence).
Avoid contractions.
Stay focused and substantive.
Be measured and confident.
Maintain professional polish.
Key vocabulary: stripe, payments, billing, commerce, agents.
Channel the personality of: The Coach.
```

## Usage

### Basic analysis

```bash
npx brand-voice https://notion.so
```

### Crawl more pages for deeper analysis

```bash
npx brand-voice https://stripe.com --pages 5
```

### JSON output (for pipelines, scripts, or databases)

```bash
npx brand-voice https://linear.app --format json
```

### Save to file

```bash
npx brand-voice https://vercel.com --output vercel-voice.md
```

### Compare two brands side-by-side

```bash
npx brand-voice compare https://stripe.com https://square.com
```

### Verbose mode (see crawling progress)

```bash
npx brand-voice https://figma.com --verbose
```

## Programmatic API

```js
import { analyzeBrandVoice, formatMarkdown } from "brand-voice";

const profile = await analyzeBrandVoice("https://stripe.com", {
  maxPages: 5,
  log: console.log,
});

// Full profile object
console.log(profile.tone.dimensions);
console.log(profile.personality.archetypes);
console.log(profile.aiPrompt);

// Or formatted output
console.log(formatMarkdown(profile));
```

## How It Works

1. **Crawls** the target website (homepage + internal pages, prioritizing about/blog/product pages)
2. **Extracts** clean text content (strips scripts, styles, navigation)
3. **Analyzes** 8 tone dimensions using linguistic heuristics (word patterns, sentence structure, vocabulary)
4. **Derives** personality archetypes and traits from the tone profile
5. **Generates** actionable guidelines and an AI-ready prompt

No LLM API calls. No cloud services. Everything runs locally using linguistic analysis. This means:
- ⚡ Fast (2-5 seconds per analysis)
- 🔒 Private (nothing leaves your machine)
- 💰 Free (no API keys or tokens needed)
- 🔄 Reproducible (same input → same output)

## Use Cases

- **Content teams**: Create a brand voice guide from your own website in seconds
- **Agencies**: Analyze client brands before writing copy
- **Freelancers**: Understand a new client's voice before your first draft
- **Competitors**: Study how competitors position themselves
- **AI workflows**: Generate system prompts for AI writing tools
- **Brand audits**: Compare your voice across different pages or subdomains
- **Hiring**: Give new copywriters a concrete voice reference

## Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--format` | `-f` | `markdown` | Output format: `markdown` or `json` |
| `--pages` | `-p` | `3` | Max pages to crawl (1-10) |
| `--output` | `-o` | stdout | Write to file |
| `--verbose` | `-v` | `false` | Show crawling progress |
| `--help` | `-h` | | Show help |
| `--version` | | | Show version |

## Requirements

- Node.js 18+ (uses native `fetch`)
- That's it. Zero npm dependencies.

## License

MIT — [Ad Machine](https://admachine.xyz)
