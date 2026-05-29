const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.static("../frontend"));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

// ── System prompt ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a ruthless, no-nonsense AI fake news detector and fact-checker with zero tolerance for misinformation.

## CREDIBILITY SCORE RUBRIC — USE THE FULL 0-100 RANGE:

0-5:   DANGEROUS DISINFORMATION. Completely fabricated. False health/safety claims (e.g. "bleach cures cancer"). Conspiracy theories with zero evidence.
6-15:  CLEAR FAKE NEWS. Made-up events. Fake quotes from real people. Hoaxes. Propaganda disguised as news.
16-25: ALMOST CERTAINLY FALSE. Extreme sensationalism. Zero credible sources. Contradicts established science/consensus.
26-35: HIGHLY MISLEADING. Real event but wildly distorted. Heavy fear-mongering. Cherry-picked data with no context.
36-45: MOSTLY MISLEADING. Partial truths heavily spun. Significant omissions. Clickbait headline misrepresents content.
46-55: QUESTIONABLE. Unverified claims. Anonymous sources only. Major bias. Possible but unconfirmed.
56-65: MIXED. Some verifiable facts mixed with spin. Moderate bias. Missing important context.
66-75: MOSTLY CREDIBLE. Largely accurate. Minor framing issues. Some missing context.
76-85: CREDIBLE. Well-sourced. Mostly accurate. Minor editorial bias at most.
86-95: HIGHLY CREDIBLE. Named sources. Cross-referenced facts. Balanced reporting. Professional journalism.
96-100: EXEMPLARY. Primary sources. Data-backed. Zero detectable bias. Fully verifiable. Benchmark journalism.

## HARD SCORING RULES — NEVER VIOLATE:

- verdict=FAKE        → credibility_score MUST be between 0 and 15. Obvious hoaxes/disinformation = 0 to 5.
- verdict=MISLEADING  → credibility_score MUST be between 16 and 45.
- verdict=UNVERIFIABLE→ credibility_score MUST be between 35 and 55.
- verdict=REAL        → credibility_score MUST be between 65 and 100. Strong sourced journalism = 85 to 100.
- verdict=SATIRE      → credibility_score MUST be between 5 and 20.

DO NOT give fake news a score above 15. DO NOT give real credible news a score below 65.
Score 0 is valid and expected for dangerous disinformation.
Score 100 is valid and expected for exemplary sourced journalism.

## SIGNAL SCORING RULES:
For FAKE content:
  - emotional_language: 70-100
  - sensationalism: 75-100
  - factual_density: 0-15
  - source_quality: 0-10
  - internal_consistency: 0-20
  - clickbait_score: 70-100
For REAL content:
  - emotional_language: 0-30
  - sensationalism: 0-25
  - factual_density: 60-100
  - source_quality: 60-100
  - internal_consistency: 70-100
  - clickbait_score: 0-25

## OUTPUT FORMAT:
Return ONLY a valid JSON object. No markdown. No code fences. No text before or after.
All string values must be single-line. Use \\n\\n between paragraphs in full_analysis. No HTML tags.

{
  "verdict": "FAKE" | "REAL" | "MISLEADING" | "UNVERIFIABLE" | "SATIRE",
  "credibility_score": <integer 0-100, strictly follow the rules above>,
  "summary": "<single line text>",
  "about": "<single line text>",
  "red_flags": ["flag1", "flag2", "flag3"],
  "green_flags": ["flag1", "flag2"],
  "bias_type": "<label>",
  "bias_explanation": "<single line text>",
  "manipulation_techniques": ["technique1", "technique2", "technique3"],
  "recommendation": "<single line text>",
  "fact_check_queries": ["query1", "query2", "query3"],
  "full_analysis": "<paragraph1>\\n\\n<paragraph2>\\n\\n<paragraph3>\\n\\n<paragraph4>",
  "signals": {
    "emotional_language": <0-100>,
    "sensationalism": <0-100>,
    "factual_density": <0-100>,
    "source_quality": <0-100>,
    "internal_consistency": <0-100>,
    "clickbait_score": <0-100>
  },
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "Politics | Health | Science | Economy | Crime | Entertainment | Technology | Environment",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}`;

// ── Score enforcer ─────────────────────────────────────────────────────────────
// BUG FIX: use isNaN check instead of || fallback so score=0 isn't replaced with 30
function enforceScoreRange(result) {
  const verdict = (result.verdict || "UNVERIFIABLE").toUpperCase();

  // Parse carefully — 0 is a valid score, don't let falsy || replace it
  let score = parseInt(result.credibility_score, 10);
  if (isNaN(score)) score = 40; // only fallback when truly missing

  // Hard ranges per verdict — tighter than the prompt to be extra safe
  const ranges = {
    FAKE:         [0,  15],
    FALSE:        [0,  15],
    MISLEADING:   [16, 45],
    SATIRE:       [5,  20],
    UNVERIFIABLE: [35, 55],
    REAL:         [65, 100],
    CREDIBLE:     [65, 100],
    TRUE:         [65, 100],
  };

  const range = ranges[verdict] || [0, 100];
  score = Math.max(range[0], Math.min(range[1], score));

  result.credibility_score = score;
  return result;
}

// ── Convert \\n\\n plain text → HTML paragraphs ────────────────────────────────
function processFullAnalysis(text) {
  if (!text || typeof text !== "string") return "<p>Analysis unavailable.</p>";

  return text
    .split(/\\n\\n|\n\n/)
    .map(p => p.replace(/\\n|\n/g, " ").trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${p}</p>`)
    .join("");
}

// ── Robust JSON extractor ──────────────────────────────────────────────────────
function extractJSON(raw) {
  // Strip markdown fences
  raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // Grab outermost { ... }
  const start = raw.indexOf("{");
  const end   = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new SyntaxError("No JSON object in response");

  return raw.slice(start, end + 1);
}

// ── Route ──────────────────────────────────────────────────────────────────────
app.post("/api/analyze", async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length < 20)
    return res.status(400).json({ error: "Please provide at least 20 characters." });
  if (text.length > 15000)
    return res.status(400).json({ error: "Text too long. Max 15,000 characters." });

  let rawResponse = "";

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `Analyze the following news content.\n` +
            `REMINDER: Score 0-5 for dangerous disinformation, 0-15 for FAKE, 65-100 for REAL.\n` +
            `Return ONLY valid JSON. No markdown. No HTML in strings.\n\n` +
            `CONTENT:\n${text}`
        },
      ],
      temperature: 0.1,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    rawResponse = completion.choices[0]?.message?.content || "";
    console.log("✅ Raw (first 200):", rawResponse.slice(0, 200));

    const cleaned = extractJSON(rawResponse);
    let result    = JSON.parse(cleaned);

    // Fix score=0 bug, then clamp to correct range
    result = enforceScoreRange(result);

    // Convert plain-text analysis to HTML paragraphs
    result.full_analysis = processFullAnalysis(result.full_analysis);

    console.log(`📊 Verdict: ${result.verdict} | Score: ${result.credibility_score}`);
    res.json({ success: true, result });

  } catch (err) {
    console.error("❌ Error:", err.message);
    if (rawResponse) console.error("Raw snippet:", rawResponse.slice(0, 500));
    res.status(500).json({
      error: err instanceof SyntaxError
        ? "AI returned malformed JSON — please try again."
        : err.message || "Analysis failed.",
    });
  }
});

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", model: MODEL, timestamp: new Date().toISOString() })
);

app.listen(PORT, () => {
  console.log(`\n🔍 TruthEngine API  →  http://localhost:${PORT}`);
  console.log(`🤖 Model            →  ${MODEL}`);
  console.log(`📡 Health           →  http://localhost:${PORT}/api/health\n`);
});
