# voiceprint

> Reverse-engineer any brand's voice into a deployable AI identity file.

Point it at any URL. Get a deployable `VOICE.md` in seconds — archetypes, tone spectrum, vocabulary DNA, and a copy-paste AI prompt. Zero dependencies. Zero API keys.

**🌐 [voiceprint.sh](https://slashimagine.github.io/brand-voice/) · [View Demo](https://github.com/SlashImagine/brand-voice/raw/gh-pages/demo.mp4)**

---

## The output isn't a report. It's a `VOICE.md`.

Most tools give you analytics. voiceprint gives you something you can actually use — a deployable brand identity file.

Drop `VOICE.md` into any project, AI agent, or system prompt. Your AI will write indistinguishably from that brand.

Think `SOUL.md` — but for any company on the internet.

---

## Quick start

```bash
# No install required
npx voiceprint https://liquiddeath.com --voice

# Save to file
npx voiceprint https://yourbrand.com --voice --output VOICE.md

# Compare two brands
npx voiceprint compare stripe.com square.com

# Raw analytics view
npx voiceprint https://stripe.com

# JSON output for pipelines
npx voiceprint https://notion.so --format json
```

---

## What you get

### `--voice` — Deployable `VOICE.md`

```markdown
# Liquid Death — VOICE.md
> The brand voice operating system.
> Every word should be indistinguishable from Liquid Death.

## The One-Line Brief
Liquid Death is a provocateur. It speaks in the voice of The Outlaw —
provocative, irreverent, witty. Darkness is a feature, not a bug.

## Archetypes
The Outlaw · The Rebel · The Anti-Hero · The Jester

## Irreverence Score
██████████ 10/10

## ✅ Always
- Lean into dark, unexpected, provocative
- Mock corporate speak — it's the positioning
- Short punchy lines. Let the joke breathe.

## ❌ Never
- Sanitize the edge. That kills the voice.
- Sound like a normal beverage brand.
- Explain the joke.

## System Prompt
[copy-paste into ChatGPT, Claude, or any agent]
```

See [`examples/liquid-death-VOICE.md`](examples/liquid-death-VOICE.md) for the full output.

### Analytics view (default)

```
$ npx voiceprint https://liquiddeath.com

🎙️  Brand Voice Profile: Liquid Death

Archetypes:  The Outlaw · The Rebel · The Anti-Hero · The Jester
Traits:      provocative · irreverent · witty · direct

Earnest      ██████████  Irreverent   10.0/10
Humorous     ██████░░░░               6.1/10
Human        ███████░░░               6.8/10
Active       ███████░░░               6.7/10
Concise      ███████░░░               7.0/10

Reading level:  Elementary (Grade 2) · avg 13.3 words/sentence
Power words:    death · murder · skull · evil · savage · thirst
```

---

## 12 personality archetypes

| Archetype | Signals |
|-----------|---------|
| **The Outlaw** | Dark language, anti-establishment, 7+ irreverence |
| **The Rebel** | Counter-culture, punk signals, 5+ irreverence |
| **The Anti-Hero** | Irreverent + humorous, refuses convention |
| **The Jester** | Absurdist logic, short punchlines, wit |
| **The Expert** | Technical, precise, formal |
| **The Sage** | Educational, calm authority |
| **The Storyteller** | Human, warm, community-focused |
| **The Coach** | Action-driven, imperative-heavy CTAs |
| **The Friend** | Casual, contractions, approachable |
| **The Minimalist** | Concise, few words, lets product speak |
| **The Analyst** | Data-driven, specific, numbers-forward |
| **The Doer** | Active voice, direct, no passive constructions |

---

## 10-dimension tone spectrum

Each dimension scored 1–10:

- **Formal ↔ Casual** — contractions, slang, register
- **Serious ↔ Playful** — humor signals, emoji, energy
- **Technical ↔ Accessible** — jargon load, readability
- **Reserved ↔ Enthusiastic** — exclamations, superlatives
- **Corporate ↔ Human** — "you/we" vs corporate buzzwords
- **Passive ↔ Active** — voice construction analysis
- **Vague ↔ Specific** — numbers, concrete examples
- **Long-winded ↔ Concise** — avg sentence length
- **Earnest ↔ Irreverent** — dark language, anti-establishment signals *(new)*
- **Dry ↔ Humorous** — absurdist, wit, rhetorical patterns *(new)*

---

## Install

```bash
# npx (no install)
npx voiceprint <url>

# global install
npm install -g voiceprint

# from source
git clone https://github.com/SlashImagine/brand-voice
node bin/cli.js <url>
```

**Requirements:** Node.js 18+. Zero dependencies. Zero API keys.

---

## CLI options

```
Usage:
  voiceprint <url>                    Analyze brand voice
  voiceprint <url> --voice            Output deployable VOICE.md
  voiceprint <url> --output VOICE.md  Save to file
  voiceprint <url> --format json      Raw JSON output
  voiceprint <url> --pages 10         Crawl more pages (default: 8)
  voiceprint compare <url1> <url2>    Side-by-side brand diff

Options:
  --voice, -V     Deployable VOICE.md (drop into any project/AI tool)
  --format, -f    markdown (default) | json | voice
  --pages, -p     Pages to crawl, max 20 (default: 8)
  --output, -o    Write to file
  --verbose, -v   Show crawl progress
```

---

## Examples

See the [`examples/`](examples/) directory:

- [`liquid-death-VOICE.md`](examples/liquid-death-VOICE.md) — Full VOICE.md for Liquid Death

---

## How it works

1. **Crawl** — Fetches up to 8 pages, prioritizing `/about`, `/story`, `/mission`, `/manifesto`, `/blog`. Nav and header copy included — that's where taglines live.
2. **Analyze** — Runs 10-dimension tone analysis using linguistic heuristics. No AI required.
3. **Generate** — Produces archetypes, guidelines, vocabulary DNA, example copy, and an AI-ready system prompt.

Zero network calls beyond the target website. Runs entirely locally.

---

## Why voiceprint gets Liquid Death right

Before v2, the tool returned *"The Analyst, The Minimalist — serious, warm, concise"* for Liquid Death.

The fix:
- **Nav/header tags back in the crawl** — "Murder Your Thirst" lives in the header. Stripping it kills the signal.
- **8 pages default** (was 3) — brand personality lives in `/about` and the manifesto, not the product listing.
- **New archetypes** — The Outlaw, The Rebel, The Anti-Hero, The Jester. The old set had no concept of irreverence.
- **New tone dimensions** — `Earnest ↔ Irreverent` + `Dry ↔ Humorous`. Liquid Death now scores 10/10 Irreverent.

---

## Made by

[Ad Machine](https://admachine.xyz) — AI-powered ad generation.

MIT License · [GitHub](https://github.com/SlashImagine/brand-voice) · [Site](https://slashimagine.github.io/brand-voice/)
