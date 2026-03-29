import { describe, it } from "node:test";
import assert from "node:assert";
import { analyzeBrandVoice } from "../src/analyzer.js";
import { formatMarkdown, formatJSON } from "../src/formatter.js";

describe("analyzeBrandVoice", () => {
  it("should throw on empty/unreachable URL", async () => {
    await assert.rejects(
      () => analyzeBrandVoice("http://localhost:19999"),
      (err) => err.message.includes("Could not extract content") || err.message.includes("fetch")
    );
  });
});

describe("formatMarkdown", () => {
  it("should format a profile into markdown", () => {
    const profile = {
      brand: "TestCo",
      url: "https://test.com",
      pagesAnalyzed: 1,
      summary: "TestCo speaks as The Friend.",
      tone: {
        dimensions: [
          { name: "Formal ↔ Casual", score: 7 },
          { name: "Serious ↔ Playful", score: 5 },
        ],
        dominant: [{ name: "Formal ↔ Casual", score: 7 }],
      },
      vocabulary: {
        totalWords: 1000,
        uniqueWords: 300,
        vocabularyRichness: 0.3,
        averageWordLength: 5.2,
        powerWords: [{ word: "test", count: 10 }],
        jargon: ["API"],
      },
      structure: {
        averageSentenceLength: 15,
        sentenceCount: 50,
        questionRatio: 0.1,
        exclamationRatio: 0.05,
        imperativeRatio: 0.02,
        readingLevel: { grade: 8, label: "Middle School" },
      },
      personality: {
        archetypes: ["The Friend"],
        traits: ["approachable", "clear"],
      },
      guidelines: {
        dos: ["Use contractions"],
        donts: ["Sound robotic"],
      },
      aiPrompt: "You are TestCo.",
    };

    const md = formatMarkdown(profile);
    assert.ok(md.includes("TestCo"));
    assert.ok(md.includes("The Friend"));
    assert.ok(md.includes("AI Prompt"));
  });
});

describe("formatJSON", () => {
  it("should produce valid JSON", () => {
    const profile = { brand: "Test", tone: {} };
    const json = formatJSON(profile);
    assert.deepStrictEqual(JSON.parse(json), profile);
  });
});
