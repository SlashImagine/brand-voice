#!/usr/bin/env node

import { parseArgs } from "node:util";
import { analyzeBrandVoice } from "../src/index.js";
import { formatMarkdown, formatVoiceFile, formatJSON } from "../src/formatter.js";

const help = `
  tonethief — Steal any brand's voice. Outputs a deployable VOICE.md.

  Usage:
    tonethief <url>                     Output VOICE.md (default)
    tonethief <url> --output VOICE.md   Save to file
    tonethief <url> --analytics         Scores/analytics view instead of VOICE.md
    tonethief <url> --format json       Raw JSON output
    tonethief <url> --pages 10          Crawl more pages (default: 8, max: 20)
    tonethief compare <url1> <url2>     Side-by-side brand comparison

  Options:
    --analytics, -a   Scores/stats view instead of VOICE.md
    --format, -f      voice (default) | markdown | json
    --pages, -p       Pages to crawl (default: 8, max: 20)
    --output, -o      Write output to file
    --verbose, -v     Show crawl progress
    --help, -h        Show this help
    --version         Show version

  Examples:
    tonethief https://liquiddeath.com
    tonethief https://yourbrand.com --output VOICE.md
    tonethief compare https://stripe.com https://square.com
    tonethief https://notion.so --analytics
    tonethief https://stripe.com --format json

  What is a VOICE.md?
    A deployable brand identity file. Drop it into any project, AI agent,
    or system prompt and your AI writes indistinguishably from that brand.
    Think SOUL.md — but for any company on the internet.
`;

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      analytics: { type: "boolean", short: "a", default: false },
      format:    { type: "string",  short: "f", default: "voice" },
      pages:     { type: "string",  short: "p", default: "8" },
      output:    { type: "string",  short: "o" },
      verbose:   { type: "boolean", short: "v", default: false },
      help:      { type: "boolean", short: "h", default: false },
      version:   { type: "boolean",             default: false },
    },
  });

  if (values.help || positionals.length === 0) {
    console.log(help);
    process.exit(0);
  }

  if (values.version) {
    const pkg = await import("../package.json", { with: { type: "json" } });
    console.log(pkg.default.version);
    process.exit(0);
  }

  const isCompare = positionals[0] === "compare";
  const urls = isCompare ? positionals.slice(1) : [positionals[0]];
  const maxPages = Math.min(parseInt(values.pages) || 8, 20);

  // VOICE.md is the default. --analytics or --format markdown/json opts out.
  const wantVoiceDoc = !values.analytics
    && values.format !== "markdown"
    && values.format !== "json";

  if (urls.length === 0 || (isCompare && urls.length < 2)) {
    console.error(isCompare ? "Error: compare requires two URLs" : "Error: provide a URL");
    process.exit(1);
  }

  const log = values.verbose ? (msg) => process.stderr.write(`  ${msg}\n`) : () => {};

  if (isCompare) {
    log(`Analyzing ${urls[0]}...`);
    const a = await analyzeBrandVoice(urls[0], { maxPages, log });
    log(`Analyzing ${urls[1]}...`);
    const b = await analyzeBrandVoice(urls[1], { maxPages, log });

    // Side-by-side comparison as markdown (both profiles)
    const output = values.format === "json"
      ? JSON.stringify({ brands: [a, b] }, null, 2)
      : `# Brand Comparison: ${a.brand} vs ${b.brand}\n\n## ${a.brand}\n${formatVoiceFile(a)}\n\n---\n\n## ${b.brand}\n${formatVoiceFile(b)}`;

    await write(output, values.output);
  } else {
    log(`Crawling ${urls[0]}...`);
    const result = await analyzeBrandVoice(urls[0], { maxPages, log });

    let output;
    if (wantVoiceDoc) {
      output = formatVoiceFile(result);
      if (!values.output) {
        const slug = result.brand.toLowerCase().replace(/[^a-z0-9]/g, "-");
        process.stderr.write(`\n  💾 Tip: save with --output ${slug}-VOICE.md\n\n`);
      }
    } else if (values.format === "json") {
      output = formatJSON(result);
    } else {
      output = formatMarkdown(result);
    }

    await write(output, values.output);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}

async function write(content, outputPath) {
  if (outputPath) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(outputPath, content, "utf-8");
    process.stderr.write(`  ✓ Written to ${outputPath}\n`);
  } else {
    console.log(content);
  }
}
