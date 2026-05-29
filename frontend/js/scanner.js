/**
 * TRUTH ENGINE — SCANNER MODULE
 * Handles the scanning animation sequence and state transitions
 */

const Scanner = (function () {
  "use strict";

  const STEPS = [
    "Tokenizing text patterns...",
    "Analyzing linguistic structure...",
    "Measuring emotional manipulation...",
    "Detecting propaganda signatures...",
    "Cross-referencing credibility markers...",
    "Computing bias signals...",
    "Synthesizing full analysis report...",
  ];

  let _progressInterval = null;
  let _stepIndex = 0;
  let _progressVal = 0;

  // ── DOM helpers ─────────────────────────────────────
  function el(id) { return document.getElementById(id); }

  // ── Show scanning state ──────────────────────────────
  function show() {
    el("inputSection").style.display    = "none";
    el("resultsSection").classList.remove("show");
    el("scanningSection").classList.add("active");

    // Reset
    _stepIndex   = 0;
    _progressVal = 0;
    el("scanSteps").innerHTML    = "";
    el("scanProgress").style.width = "0%";

    _scheduleSteps();
    _animateProgress();
  }

  function hide() {
    el("scanningSection").classList.remove("active");
    clearInterval(_progressInterval);
  }

  // ── Step-by-step list ───────────────────────────────
  function _scheduleSteps() {
    STEPS.forEach((text, i) => {
      setTimeout(() => {
        const stepsEl = el("scanSteps");

        // Mark previous as done
        if (i > 0) {
          const prev = stepsEl.children[i - 1];
          if (prev) { prev.classList.remove("active"); prev.classList.add("done"); }
        }

        const div = document.createElement("div");
        div.className = "scan-step active";
        div.textContent = text;
        div.style.animationDelay = "0s";
        stepsEl.appendChild(div);

        // Scroll into view
        div.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, i * 600);
    });
  }

  // ── Fake progress bar ───────────────────────────────
  function _animateProgress() {
    clearInterval(_progressInterval);
    const totalMs   = STEPS.length * 600 + 400;
    const tickMs    = 60;
    const increment = 90 / (totalMs / tickMs); // reach ~90%, jump to 100 on finish

    _progressInterval = setInterval(() => {
      _progressVal = Math.min(_progressVal + increment, 90);
      el("scanProgress").style.width = _progressVal + "%";
      if (_progressVal >= 90) clearInterval(_progressInterval);
    }, tickMs);
  }

  function complete() {
    clearInterval(_progressInterval);
    el("scanProgress").style.transition = "width .4s ease";
    el("scanProgress").style.width = "100%";

    // Mark all steps done
    Array.from(el("scanSteps").children).forEach((s) => {
      s.classList.remove("active");
      s.classList.add("done");
    });

    setTimeout(hide, 400);
  }

  // ── Expose ──────────────────────────────────────────
  return { show, complete };
})();
