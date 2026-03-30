/* ── tonethief landing — interactions ── */

// Terminal typewriter
const SEQUENCES = [
  {
    cmd: "$ npx tonethief https://liquiddeath.com",
    lines: [
      "",
      "  🎙️  Brand Voice Profile: Liquid Death",
      "",
      "  ⚡ Archetypes   The Rebel · The Jester · The Maverick",
      "  😈 Traits       witty · energetic · irreverent · absurdist",
      "  📊 Irreverence  ██████████ 10/10",
      "  📊 Playful      ████████░░  7.6/10",
      "  📊 Active       ███████░░░  6.7/10",
      "",
      "  ✅  VOICE.md ready — drop it into any AI tool",
      '  💾  Saved to liquid-death-VOICE.md',
    ],
    highlight: {
      "The Rebel · The Jester · The Maverick": "t-value",
      "witty · energetic · irreverent · absurdist": "t-value",
      "██████████ 10/10": "t-bar",
      "████████░░  7.6/10": "t-bar",
      "███████░░░  6.7/10": "t-bar",
      "VOICE.md ready": "t-value",
    }
  },
  {
    cmd: "$ npx tonethief https://stripe.com --analytics",
    lines: [
      "",
      "  🎙️  Brand Voice Profile: Stripe",
      "",
      "  ⚡ Archetypes   The Expert · The Sage · The Minimalist",
      "  🎯 Traits       technical · precise · calm · authoritative",
      "  📊 Technical    ██████░░░░  3.8/10",
      "  📊 Concise      █████████░  8.2/10",
      "  📊 Specific     ████████░░  7.9/10",
      "",
      "  ✅  AI Prompt ready — copy to clipboard",
    ],
    highlight: {
      "The Expert · The Sage · The Minimalist": "t-value",
      "technical · precise · calm · authoritative": "t-value",
      "██████░░░░  3.8/10": "t-bar",
      "█████████░  8.2/10": "t-bar",
      "████████░░  7.9/10": "t-bar",
    }
  },
  {
    cmd: "$ npx tonethief compare stripe.com liquiddeath.com",
    lines: [
      "",
      "  ⚔️  Brand Voice Comparison",
      "",
      "  Stripe        The Expert · The Minimalist",
      "  Liquid Death  The Rebel · The Jester",
      "",
      "  Key Differences:",
      "  Conventional ↔ Irreverent  Stripe 4.1  vs  Liquid Death 9.5  ◀ big diff",
      "  Formal ↔ Casual           Stripe 5.6  vs  Liquid Death 5.2",
      "  Safe ↔ Provocative        Stripe 3.0  vs  Liquid Death 6.0",
    ],
    highlight: {
      "The Expert · The Minimalist": "t-value",
      "The Rebel · The Jester": "t-value",
      "◀ big diff": "t-bar",
    }
  }
];

let seqIndex = 0;
let charIndex = 0;
let lineIndex = 0;
let phase = "cmd"; // cmd | pause | lines | end-pause
let outputEl, cursorEl;
let timer = null;

function getHighlightClass(line, seq) {
  for (const [pattern, cls] of Object.entries(seq.highlight || {})) {
    if (line.includes(pattern)) return { pattern, cls };
  }
  return null;
}

function renderLine(line, seq) {
  const hl = getHighlightClass(line, seq);
  if (!hl) return `<span class="t-label">${escHtml(line)}</span>`;
  const before = line.substring(0, line.indexOf(hl.pattern));
  const after = line.substring(line.indexOf(hl.pattern) + hl.pattern.length);
  return `<span class="t-label">${escHtml(before)}</span><span class="${hl.cls}">${escHtml(hl.pattern)}</span><span class="t-label">${escHtml(after)}</span>`;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function tick() {
  const seq = SEQUENCES[seqIndex];

  if (phase === "cmd") {
    if (charIndex <= seq.cmd.length) {
      outputEl.innerHTML = `<span class="t-cmd">${escHtml(seq.cmd.slice(0, charIndex))}</span>`;
      charIndex++;
      timer = setTimeout(tick, charIndex <= 2 ? 80 : 28 + Math.random() * 20);
    } else {
      phase = "pause";
      timer = setTimeout(tick, 400);
    }
  } else if (phase === "pause") {
    phase = "lines";
    lineIndex = 0;
    timer = setTimeout(tick, 80);
  } else if (phase === "lines") {
    if (lineIndex < seq.lines.length) {
      const rendered = seq.lines
        .slice(0, lineIndex + 1)
        .map(l => `<div>${renderLine(l, seq)}</div>`)
        .join("");
      outputEl.innerHTML = `<div><span class="t-cmd">${escHtml(seq.cmd)}</span></div>${rendered}`;
      lineIndex++;
      timer = setTimeout(tick, 55 + Math.random() * 30);
    } else {
      phase = "end-pause";
      timer = setTimeout(tick, 3200);
    }
  } else if (phase === "end-pause") {
    outputEl.innerHTML = "";
    seqIndex = (seqIndex + 1) % SEQUENCES.length;
    charIndex = 0;
    lineIndex = 0;
    phase = "cmd";
    timer = setTimeout(tick, 300);
  }
}

// Copy buttons
function initCopyButtons() {
  document.querySelectorAll('[data-copy]').forEach(el => {
    el.addEventListener('click', () => {
      const text = el.dataset.copy;
      navigator.clipboard.writeText(text).then(() => {
        const wasText = el.querySelector('.cta-text');
        if (wasText) {
          const orig = wasText.textContent;
          wasText.textContent = '✓ Copied!';
          el.classList.add('copied');
          setTimeout(() => {
            wasText.textContent = orig;
            el.classList.remove('copied');
          }, 2000);
        } else {
          const orig = el.textContent;
          el.textContent = 'Copied!';
          el.classList.add('copied');
          setTimeout(() => {
            el.textContent = orig;
            el.classList.remove('copied');
          }, 2000);
        }
      });
    });
  });
}

// Tabs
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`)?.classList.add('active');
    });
  });
}

// Scroll reveal
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal-child').forEach(el => observer.observe(el));
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  outputEl = document.getElementById('terminal-output');
  cursorEl = document.getElementById('terminal-cursor');
  if (outputEl) tick();
  initCopyButtons();
  initTabs();
  initReveal();
});
