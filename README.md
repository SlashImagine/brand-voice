# 🎙️ tonethief

**Steal any brand's voice. Instantly.**

Point it at any URL. Get a deployable `VOICE.md` in seconds — archetypes, tone spectrum, vocabulary DNA, and a copy-paste AI prompt that makes any LLM write indistinguishably in that brand's voice.

Zero API keys. Zero dependencies. Zero cost.

🌐 **[Website](https://slashimagine.github.io/tonethief/)**

---

## Quick Start

```bash
npx tonethief https://liquiddeath.com
```

That's it. You get a complete `VOICE.md` — drop it into any AI chat, agent, or system prompt.

## The Output

### Default — A deployable VOICE.md

Not a report. An operating manual. Drop it into any project and your AI writes as that brand.

```bash
tonethief https://liquiddeath.com --output VOICE.md
```

Includes:
- **Identity** — archetypes, traits, one-liner
- **Tone spectrum** — "extremely irreverent (9.9/10)", "notably playful (7.6/10)"
- **Writing rules** — sentence structure, vocabulary targets, reading level
- **Do/Don't guidelines** — specific to the brand, not generic advice
- **Brand-specific patterns** — dark humor, profanity, death themes, ALL CAPS as style
- **Voice test** — 4-question checklist before publishing
- **System prompt** — copy-paste into any LLM

### `--report` — Full analytical breakdown

```bash
tonethief https://stripe.com --report
```

### Compare — Side-by-side brand diff

```bash
tonethief compare https://stripe.com https://liquiddeath.com
```

### JSON — For pipelines

```bash
tonethief https://notion.so --format json --output notion.json
```

## 10-Dimension Tone Spectrum

| Dimension | What it measures |
|-----------|-----------------|
| Formal ↔ Casual | Contractions, slang, register |
| Serious ↔ Playful | Humor, wit, entertainment value |
| Technical ↔ Accessible | Jargon density, complexity |
| Reserved ↔ Enthusiastic | Energy, superlatives, exclamations |
| Corporate ↔ Human | "Synergy" vs "you and me" |
| Passive ↔ Active | Voice construction |
| Vague ↔ Specific | Numbers, data, concrete claims |
| Long-winded ↔ Concise | Sentence length, economy |
| Conventional ↔ Irreverent | Profanity, subversion, punk energy |
| Safe ↔ Provocative | Dark humor, shock value, edge |

## 12 Personality Archetypes

The Friend · The Expert · The Cheerleader · The Storyteller · The Analyst · The Coach · The Minimalist · The Doer · **The Rebel** · **The Jester** · **The Provocateur** · **The Maverick** · **The Sage**

## Smart Crawling

tonethief doesn't just scrape the homepage:

- **Prioritizes voice-rich pages** — /about, /story, /mission, /manifesto, /blog
- **Semantic zone weighting** — hero copy 3x, headings 2x, nav/footer 0x
- **Content deduplication** — catches locale variants with identical content
- **Auto-seeds** common voice paths when link discovery fails
- Default **8 pages** (configurable up to 20)

## Options

| Flag | Description |
|------|-------------|
| `--report, -r` | Full analytical markdown report |
| `--format, -f` | Output format: `voice` (default) \| `markdown` \| `json` |
| `--pages, -p` | Max pages to crawl (default: 8, max: 20) |
| `--output, -o` | Write to file instead of stdout |
| `--verbose, -v` | Show crawling progress |
| `--help, -h` | Show help |
| `--version` | Show version |

## Programmatic API

```javascript
import { analyzeBrandVoice, formatVoiceFile, formatMarkdown, formatJSON } from 'tonethief';

const profile = await analyzeBrandVoice('https://liquiddeath.com', { maxPages: 8 });

// Get the VOICE.md (default)
const voiceMd = formatVoiceFile(profile);

// Or the full report
const report = formatMarkdown(profile);

// Or raw data
const json = formatJSON(profile);
```

## How It Works

1. **Crawl** — Fetches up to 20 pages, prioritizing voice-rich content (about, blog, manifesto)
2. **Extract** — Semantic zone weighting amplifies hero copy and headings, suppresses nav/footer
3. **Analyze** — 10-dimension tone analysis using linguistic heuristics (word patterns, sentence structure, vocabulary fingerprinting)
4. **Classify** — Maps to personality archetypes and derives brand-specific patterns
5. **Generate** — Produces a deployable VOICE.md with writing rules, guidelines, and AI prompts

No AI APIs called. No data sent anywhere. Everything runs locally.

## License

MIT

---

Built by [Ad Machine](https://admachine.xyz) · [Star on GitHub](https://github.com/SlashImagine/tonethief)
