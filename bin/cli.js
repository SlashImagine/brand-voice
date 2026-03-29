#!/usr/bin/env node

import { parseArgs } from "node:util";
import { analyzeBrandVoice } from "../src/index.js";
import { formatMarkdown, formatJSON, formatComparison } from "../src/formatter.js";

const help = `
  voiceprint — Reverse-engineer any brand's voice into a deployable identity file.

  Usage:
    voiceprint <url>                          Analyze a brand's voice
    voiceprint <url> --voice                  Output a deployable VOICE.md
    voiceprint <url> --output VOICE.md        Save to file
    voiceprint <url> --format json            Output raw JSON
    voiceprint <url> --pages 10               Crawl more pages (default: 8)
    voiceprint compare <url1> <url2>          Compare two brands side-by-side

  Options:
    --voice, -V       Output deployable VOICE.md (drop into any project/AI tool)
    --format, -f      Output format: markdown (default) | json | voice
    --pages, -p       Max pages to crawl (default: 8, max: 20)
    --output, -o      Write output to file instead of stdout
    --verbose, -v     Show crawling progress
    --help, -h        Show this help
    --version         Show version

  Examples:
    voiceprint https://liquiddeath.com --voice --output VOICE.md
    voiceprint https://stripe.com
    voiceprint compare https://stripe.com https://square.com
    voiceprint https://notion.so --pages 10 --format json

  What is a VOICE.md?
    A deployable brand identity file. Drop it into any project, AI agent,
    or system prompt and your AI will write indistinguishably from that brand.
    Think SOUL.md but for any company on the internet.
`;

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      voice: { type: "boolean", short: "V", default: false },
      format: { type: "string", short: "f", default: "markdown" },
      pages: { type: "string", short: "p", default: "8" },
      output: { type: "string", short: "o" },
      verbose: { type: "boolean", short: "v", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", default: false },
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
  const wantVoiceDoc = values.voice || values.format === "voice";

  if (urls.length === 0 || (isCompare && urls.length < 2)) {
    console.error(isCompare ? "Error: compare needs two URLs" : "Error: provide a URL");
    process.exit(1);
  }

  const log = values.verbose ? (msg) => process.stderr.write(`  ${msg}\n`) : () => {};

  if (isCompare) {
    log(`Analyzing ${urls[0]}...`);
    const a = await analyzeBrandVoice(urls[0], { maxPages, log });
    log(`Analyzing ${urls[1]}...`);
    const b = await analyzeBrandVoice(urls[1], { maxPages, log });

    const output = values.format === "json"
      ? JSON.stringify({ brands: [a, b] }, null, 2)
      : formatComparison(a, b);

    await write(output, values.output);
  } else {
    log(`Crawling ${urls[0]}...`);
    const result = await analyzeBrandVoice(urls[0], { maxPages, log });

    let output;
    if (wantVoiceDoc) {
      output = result.voiceDoc;
      // If no explicit output file and --voice flag, suggest a filename
      if (!values.output && values.voice) {
        const brandSlug = result.brand.toLowerCase().replace(/[^a-z0-9]/g, "-");
        process.stderr.write(`\n  💾 Tip: save with --output ${brandSlug}-VOICE.md\n\n`);
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
