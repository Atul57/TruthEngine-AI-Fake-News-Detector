/**
 * TRUTH ENGINE — RENDERER MODULE
 * Maps AI analysis JSON → DOM elements with animations
 */

const Renderer = (function () {
  "use strict";

  function el(id) { return document.getElementById(id); }

  // ── Verdict colour theming ───────────────────────────
  const VERDICT_THEMES = {
    FAKE:        { accent: "#e63946", bg: "rgba(230,57,70,.05)",  border: "rgba(230,57,70,.35)", label: "FAKE NEWS" },
    FALSE:       { accent: "#e63946", bg: "rgba(230,57,70,.05)",  border: "rgba(230,57,70,.35)", label: "FALSE" },
    REAL:        { accent: "#00f5d4", bg: "rgba(0,245,212,.04)",  border: "rgba(0,245,212,.3)",  label: "CREDIBLE" },
    CREDIBLE:    { accent: "#00f5d4", bg: "rgba(0,245,212,.04)",  border: "rgba(0,245,212,.3)",  label: "CREDIBLE" },
    TRUE:        { accent: "#00f5d4", bg: "rgba(0,245,212,.04)",  border: "rgba(0,245,212,.3)",  label: "TRUE" },
    MISLEADING:  { accent: "#f4a261", bg: "rgba(244,162,97,.05)", border: "rgba(244,162,97,.3)", label: "MISLEADING" },
    SATIRE:      { accent: "#9d4edd", bg: "rgba(157,78,221,.05)", border: "rgba(157,78,221,.3)", label: "SATIRE" },
    UNVERIFIABLE:{ accent: "#f4a261", bg: "rgba(244,162,97,.05)", border: "rgba(244,162,97,.3)", label: "UNVERIFIABLE" },
  };

  function getTheme(verdict) {
    return VERDICT_THEMES[(verdict || "").toUpperCase()] || VERDICT_THEMES["UNVERIFIABLE"];
  }

  // ── Signal meta ─────────────────────────────────────
  const SIGNAL_META = [
    { key: "emotional_language",   label: "Emotional Language",    hi: "red",  descriptor: (v) => v > 65 ? "HIGH"   : v > 35 ? "MED"    : "LOW"  },
    { key: "sensationalism",       label: "Sensationalism",        hi: "red",  descriptor: (v) => v > 65 ? "HIGH"   : v > 35 ? "MED"    : "LOW"  },
    { key: "factual_density",      label: "Factual Density",       hi: "teal", descriptor: (v) => v > 65 ? "DENSE"  : v > 35 ? "SPARSE" : "THIN" },
    { key: "source_quality",       label: "Source Quality",        hi: "teal", descriptor: (v) => v > 65 ? "STRONG" : v > 35 ? "WEAK"   : "NONE" },
    { key: "internal_consistency", label: "Internal Consistency",  hi: "teal", descriptor: (v) => v > 65 ? "SOLID"  : v > 35 ? "SHAKY"  : "POOR" },
    { key: "clickbait_score",      label: "Clickbait Score",       hi: "red",  descriptor: (v) => v > 65 ? "HIGH"   : v > 35 ? "MED"    : "LOW"  },
  ];

  const SIGNAL_COLORS = {
    red:   ["#e63946", "#c1121f"],
    teal:  ["#00f5d4", "#00b89a"],
    amber: ["#f4a261", "#e07b3f"],
  };

  // ── Safe score parser ────────────────────────────────
  // CRITICAL: never use (value || fallback) for numbers — 0 is falsy
  function safeScore(raw) {
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : Math.min(100, Math.max(0, n));
  }

  // ── List helper ─────────────────────────────────────
  function renderList(listId, items, fallback) {
    const ul = el(listId);
    if (!ul) return;
    ul.innerHTML = "";
    const arr = Array.isArray(items) && items.length > 0 ? items : [fallback || "None detected."];
    arr.forEach((item, i) => {
      const li = document.createElement("li");
      li.textContent = item;
      li.style.animationDelay = `${i * 0.07}s`;
      ul.appendChild(li);
    });
  }

  // ── Tags ────────────────────────────────────────────
  function renderTags(tags) {
    const row = el("tagsRow");
    if (!row) return;
    row.innerHTML = "";
    const palette = ["tag-red", "tag-teal", "tag-amber", "tag-purple"];
    (tags || []).forEach((tag, i) => {
      const span = document.createElement("span");
      span.className = `tag ${palette[i % palette.length]}`;
      span.textContent = tag;
      span.style.animationDelay = `${i * 0.06}s`;
      row.appendChild(span);
    });
  }

  // ── Credibility ring ────────────────────────────────
  function animateRing(score, accentColor) {
    const circumference = 314; // 2π × r(50)
    // When score=0 the ring should be completely empty (full offset)
    const offset = circumference - (score / 100) * circumference;

    const fill = el("ringFill");
    if (!fill) return;
    fill.style.stroke = accentColor;
    fill.style.transition = "none";
    fill.style.strokeDashoffset = circumference.toString(); // always start from empty
    fill.style.strokeDasharray  = circumference.toString();

    // Force reflow so the reset sticks, then animate to final offset
    void fill.getBoundingClientRect();

    requestAnimationFrame(() => {
      fill.style.transition = "stroke-dashoffset 1.5s cubic-bezier(.16,1,.3,1)";
      fill.style.strokeDashoffset = offset.toString();
    });

    // Count-up number — handle score=0 correctly
    const scoreEl = el("ringScore");
    if (!scoreEl) return;
    scoreEl.style.color = accentColor;

    if (score === 0) {
      // Score is exactly 0 — just show 0 immediately, no animation needed
      scoreEl.textContent = "0";
      return;
    }

    let current = 0;
    const totalFrames = 60;
    const step = score / totalFrames; // always > 0 since score > 0
    const timer = setInterval(() => {
      current = Math.min(current + step, score);
      scoreEl.textContent = Math.round(current);
      if (current >= score) {
        scoreEl.textContent = score; // ensure exact final value
        clearInterval(timer);
      }
    }, 25);
  }

  // ── Signal bars ─────────────────────────────────────
  function renderSignals(signals) {
    const grid = el("signalsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    SIGNAL_META.forEach((meta, idx) => {
      // CRITICAL: use safeScore, not ?? 50, so 0-value signals display correctly
      const raw = signals?.[meta.key];
      const val = raw !== undefined && raw !== null ? Math.min(100, Math.max(0, parseInt(raw, 10) || 0)) : 50;
      const colors = SIGNAL_COLORS[meta.hi];
      const desc = meta.descriptor(val);

      const row = document.createElement("div");
      row.className = "signal-row";
      row.innerHTML = `
        <div class="signal-name">${meta.label}</div>
        <div class="signal-track">
          <div class="signal-fill" id="sig_${meta.key}"
               style="background: linear-gradient(90deg, ${colors[0]}, ${colors[1]}); width: 0%"></div>
        </div>
        <div class="signal-val-badge">${val}%</div>
        <div class="signal-descriptor">${desc}</div>
      `;
      grid.appendChild(row);

      // Animate fill — even 0% is valid
      setTimeout(() => {
        const fillEl = document.getElementById(`sig_${meta.key}`);
        if (fillEl) fillEl.style.width = val + "%";
      }, 300 + idx * 100);
    });
  }

  // ── Full analysis text ──────────────────────────────
  function renderFullAnalysis(text) {
    const body = el("fullAnalysisBody");
    if (!body) return;
    if (!text) { body.innerHTML = "<p>Analysis unavailable.</p>"; return; }

    if (text.includes("<p>")) {
      body.innerHTML = text;
    } else {
      body.innerHTML = text
        .split(/\n\n+/)
        .map((p) => `<p>${p.trim()}</p>`)
        .filter(p => p !== "<p></p>")
        .join("");
    }
  }

  // ── Verdict banner styling ───────────────────────────
  function styleVerdictBanner(theme) {
    const banner = el("verdictBanner");
    if (!banner) return;
    banner.style.setProperty("--verdict-bg",     theme.bg);
    banner.style.setProperty("--verdict-border", theme.border);
    banner.style.setProperty("--verdict-accent", theme.accent);
    banner.style.setProperty("--verdict-color",  theme.accent);
  }

  // ── Main render ─────────────────────────────────────
  function render(result) {
    const v     = (result.verdict || "UNVERIFIABLE").toUpperCase();
    const theme = getTheme(v);

    // CRITICAL FIX: parse score safely — never use || which treats 0 as falsy
    const score = safeScore(result.credibility_score) ?? 0;

    console.log(`🎨 Rendering — Verdict: ${v} | Score: ${score}`);

    // Verdict banner
    styleVerdictBanner(theme);
    el("verdictText").textContent = theme.label;
    el("verdictText").classList.remove("glitch");
    void el("verdictText").offsetWidth;
    el("verdictText").classList.add("glitch");

    // Severity
    const severityColors = { LOW: "#00f5d4", MEDIUM: "#f4a261", HIGH: "#e63946", CRITICAL: "#e63946" };
    const sev = (result.severity || "MEDIUM").toUpperCase();
    el("verdictSeverity").textContent = `SEVERITY: ${sev}`;
    el("verdictSeverity").style.color = severityColors[sev] || "#f4a261";

    // Credibility ring — pass raw score, animateRing handles 0 correctly
    animateRing(score, theme.accent);

    // Tags
    renderTags(result.tags || []);

    // About / quick stats
    el("aboutText").textContent    = result.about || result.summary || "—";
    el("categoryVal").textContent  = result.category || "—";
    el("biasVal").textContent      = result.bias_type || "—";
    el("severityVal").textContent  = result.severity || "—";
    el("severityVal").style.color  = severityColors[sev] || "#f4a261";

    // Flags
    renderList("redFlagsList",   result.red_flags,  "No red flags detected.");
    renderList("greenFlagsList", result.green_flags, "No credibility indicators found.");

    // Bias & manipulation
    el("biasExplanation").textContent = result.bias_explanation || "—";
    renderList("manipList",      result.manipulation_techniques, "None detected.");
    el("recommendText").textContent   = result.recommendation || "—";

    // Fact-check queries (clickable Google search)
    const fcList = el("factCheckList");
    fcList.innerHTML = "";
    (result.fact_check_queries || []).forEach((q, i) => {
      const li = document.createElement("li");
      li.textContent = q;
      li.title = "Click to search on Google";
      li.style.animationDelay = `${i * 0.07}s`;
      li.addEventListener("click", () =>
        window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank")
      );
      fcList.appendChild(li);
    });

    // Signals
    renderSignals(result.signals);

    // Full analysis
    renderFullAnalysis(result.full_analysis);

    // Timestamp
    el("analysisTimestamp").textContent = new Date().toLocaleString();

    // Show results section
    el("resultsSection").classList.add("show");
    setTimeout(() => el("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  return { render };
})();
