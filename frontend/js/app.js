/**
 * TRUTH ENGINE — MAIN APP
 * Entry point: wires up all modules, handles API calls,
 * example content, session stats, copy/share helpers.
 */

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────
  const API_BASE = "http://localhost:3001";  // Backend URL

  // ── Example articles ────────────────────────────────
  const EXAMPLES = [
    {
      label: "Fake Health Claim",
      text: `BREAKING: Scientists DISCOVER that drinking bleach mixed with lemon juice CURES all forms of cancer in just 3 days! Big pharma is DESPERATELY trying to hide this information from the public. A secret government document leaked online claims that over 90% of cancers can be cured with household chemicals. Doctors who revealed this treatment have mysteriously disappeared. Share this before it gets deleted! The mainstream media REFUSES to cover this bombshell story. Your family's life may depend on this information.`,
    },
    {
      label: "Real News",
      text: `NASA's James Webb Space Telescope has captured the deepest infrared image of the universe ever taken, revealing thousands of galaxies, some of which formed just 600 million years after the Big Bang. The image, released by NASA alongside ESA and the Canadian Space Agency, shows galaxy cluster SMACS 0723 as it appeared 4.6 billion years ago. Scientists say the level of detail surpasses what the Hubble telescope achieved in weeks, accomplished in just 12.5 hours. The image provides a glimpse into the early universe and will help researchers study how galaxies form and evolve.`,
    },
    {
      label: "Misleading Headline",
      text: `ECONOMY IN COMPLETE FREEFALL: Stock Market COLLAPSES as 50 Million Americans Face Starvation! The Dow Jones fell 200 points on Tuesday after a report showed inflation ticked up 0.1%. Anonymous experts warn this could be the beginning of a catastrophic depression worse than 1929. The White House has allegedly begun preparing emergency food rationing plans according to unnamed sources. Economists are "terrified" about what comes next. The middle class is being systematically destroyed by globalist policies. Save yourself before it is too late.`,
    },
  ];

  // ── Session stats ────────────────────────────────────
  let stats = { analyzed: 0, fakes: 0 };
  let lastResult = null;

  function updateStats(verdict) {
    stats.analyzed++;
    const v = (verdict || "").toUpperCase();
    if (v === "FAKE" || v === "FALSE" || v === "MISLEADING") stats.fakes++;

    animateCounter("statAnalyzed", stats.analyzed);
    animateCounter("statFakes",    stats.fakes);
  }

  function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const prev  = parseInt(el.textContent) || 0;
    const step  = Math.max(1, Math.ceil((target - prev) / 20));
    let   cur   = prev;
    const timer = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = cur;
      if (cur >= target) clearInterval(timer);
    }, 30);
  }

  // ── Char counter & bar ───────────────────────────────
  function initCharCounter() {
    const input  = document.getElementById("newsInput");
    const count  = document.getElementById("charCount");
    const bar    = document.getElementById("charBarFill");
    if (!input) return;

    input.addEventListener("input", () => {
      const len = input.value.length;
      count.textContent = len.toLocaleString();

      const pct = Math.min((len / 15000) * 100, 100);
      bar.style.width = pct + "%";

      if (pct > 85)      bar.style.background = "var(--accent-red)";
      else if (pct > 60) bar.style.background = "var(--accent-amber)";
      else               bar.style.background = "var(--accent-teal)";

      // Clear error on type
      showError("");
    });
  }

  // ── Error display ────────────────────────────────────
  function showError(msg) {
    const el = document.getElementById("errorMsg");
    if (el) el.textContent = msg;
  }

  // ── Load examples ────────────────────────────────────
  window.loadExample = function (idx) {
    const ex = EXAMPLES[idx];
    if (!ex) return;
    const ta = document.getElementById("newsInput");
    if (!ta) return;
    ta.value = ex.text;
    ta.dispatchEvent(new Event("input"));
    ta.focus();
  };

  // ── Analyze ─────────────────────────────────────────
  window.analyzeNews = async function () {
    const ta  = document.getElementById("newsInput");
    const btn = document.getElementById("analyzeBtn");
    const text = (ta && ta.value.trim()) || "";

    if (text.length < 20) {
      showError("⚠ Please enter at least 20 characters of news content.");
      if (ta) ta.style.borderColor = "rgba(230,57,70,.6)";
      setTimeout(() => { if (ta) ta.style.borderColor = ""; }, 1500);
      return;
    }

    btn.disabled = true;
    Scanner.show();

    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text }),
      });

      Scanner.complete();

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Analysis failed.");

      lastResult = data.result;
      updateStats(data.result.verdict);
      Renderer.render(data.result);

    } catch (err) {
      Scanner.complete();

      // Fall back to client-side demo if backend unavailable
      if (err.message.includes("fetch") || err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        console.warn("Backend unreachable – using demo mode.");
        const demo = buildDemoResult(text);
        lastResult  = demo;
        updateStats(demo.verdict);
        Renderer.render(demo);
        showError("⚠ Backend not running — showing demo result. Start the server to use Groq AI.");
      } else {
        // Re-show input with error
        document.getElementById("inputSection").style.display = "";
        showError("⚠ " + err.message);
      }
    }

    btn.disabled = false;
  };

  // ── Reset ────────────────────────────────────────────
  window.reset = function () {
    document.getElementById("resultsSection").classList.remove("show");
    document.getElementById("inputSection").style.display = "";

    const ta = document.getElementById("newsInput");
    if (ta) { ta.value = ""; ta.dispatchEvent(new Event("input")); }

    showError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Share ────────────────────────────────────────────
  window.shareResult = function () {
    if (!lastResult) return;
    const v     = lastResult.verdict || "UNVERIFIABLE";
    const score = lastResult.credibility_score || "?";
    const text  = `I just analyzed a news article with TruthEngine AI.\n\nVerdict: ${v}\nCredibility Score: ${score}/100\n\nAlways verify your news sources! 🔍`;

    if (navigator.share) {
      navigator.share({ title: "TruthEngine Result", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text)
        .then(() => alert("Result copied to clipboard!"))
        .catch(() => alert("Share: " + text));
    }
  };

  // ── Copy full report ─────────────────────────────────
  window.copyReport = function () {
    if (!lastResult) return;
    const r = lastResult;
    const report = [
      "=== TRUTHENGINE ANALYSIS REPORT ===",
      `Date: ${new Date().toLocaleString()}`,
      "",
      `VERDICT: ${r.verdict}`,
      `CREDIBILITY SCORE: ${r.credibility_score}/100`,
      `SEVERITY: ${r.severity}`,
      `CATEGORY: ${r.category}`,
      "",
      "ABOUT:",
      r.about || r.summary,
      "",
      "RED FLAGS:",
      ...(r.red_flags || []).map((f) => `  • ${f}`),
      "",
      "GREEN FLAGS:",
      ...(r.green_flags || []).map((f) => `  • ${f}`),
      "",
      "BIAS TYPE:", r.bias_type,
      "BIAS EXPLANATION:", r.bias_explanation,
      "",
      "MANIPULATION TECHNIQUES:",
      ...(r.manipulation_techniques || []).map((t) => `  • ${t}`),
      "",
      "RECOMMENDATION:", r.recommendation,
      "",
      "FACT CHECK QUERIES:",
      ...(r.fact_check_queries || []).map((q) => `  • ${q}`),
      "",
      "=== POWERED BY GROQ LLAMA3-70B ===",
    ].join("\n");

    navigator.clipboard.writeText(report)
      .then(() => alert("Full report copied to clipboard!"))
      .catch(() => alert("Copy failed. Please select and copy manually."));
  };

  // ── Demo result (fallback) ────────────────────────────
  function buildDemoResult(text) {
    const wordCount   = text.split(/\s+/).length;
    const hasCaps     = (text.match(/[A-Z]{3,}/g) || []).length;
    const hasExclaim  = (text.match(/!/g) || []).length;
    const fakeScore   = Math.min(95, hasCaps * 8 + hasExclaim * 6 + 20);
    const credScore   = Math.max(5, 60 - fakeScore);
    const isFake      = fakeScore > 45;

    return {
      verdict:          isFake ? "FAKE" : "UNVERIFIABLE",
      credibility_score: credScore,
      summary:          "AI analysis performed in demo mode. Real analysis requires the Groq backend server.",
      about:            "This is a demonstration result generated without the AI backend. Start the Node.js server and add your Groq API key for accurate analysis.",
      red_flags:        hasCaps > 2 ? ["Excessive capitalization detected", "Possible sensationalist framing"] : ["Unable to fully assess without AI backend"],
      green_flags:      ["Demo mode active — no real analysis performed"],
      bias_type:        isFake ? "Fear-mongering" : "Unknown",
      bias_explanation: "Demo mode: connect the backend for accurate bias analysis.",
      manipulation_techniques: isFake ? ["Emotional amplification", "Urgency manufacturing"] : ["Analysis unavailable in demo mode"],
      recommendation:   "Start the backend server at localhost:3001 with your Groq API key to get real AI-powered analysis.",
      fact_check_queries: ["How to verify news articles", "Reliable fact-checking websites", "Media bias checker"],
      full_analysis:    `<p>This is a <strong>demo result</strong> generated without the AI backend. The application detected ${hasCaps} instances of capitalized phrases and ${hasExclaim} exclamation marks, which are common indicators of sensationalist writing — but a full linguistic analysis requires the Groq API.</p><p>To get accurate results: copy <code>backend/.env.example</code> to <code>backend/.env</code>, add your Groq API key, run <code>npm install && npm start</code> in the backend folder, then refresh this page.</p><p>Get your free Groq API key at <a href="https://console.groq.com" target="_blank">console.groq.com</a> — the LLaMA3-70B model is fast and free to use.</p>`,
      signals: { emotional_language: fakeScore, sensationalism: fakeScore, factual_density: 100 - fakeScore, source_quality: 100 - fakeScore, internal_consistency: 50, clickbait_score: fakeScore },
      tags:    ["Demo Mode", "Backend Required", "Groq API", isFake ? "High Suspicion" : "Unverified"],
      category: "Unknown",
      severity: isFake ? "HIGH" : "MEDIUM",
    };
  }

  // ── Init ─────────────────────────────────────────────
  function init() {
    initCharCounter();

    // Enter key in textarea (Ctrl/Cmd + Enter to submit)
    const ta = document.getElementById("newsInput");
    if (ta) {
      ta.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          window.analyzeNews();
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
