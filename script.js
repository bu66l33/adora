// ============ NAV SCROLL STATE ============
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

// ============ CURSOR GLOW ============
const glow = document.getElementById('cursorGlow');
let gx = window.innerWidth / 2, gy = window.innerHeight / 2;
let cx = gx, cy = gy;
window.addEventListener('mousemove', (e) => { gx = e.clientX; gy = e.clientY; });
function animateGlow() {
  cx += (gx - cx) * 0.12;
  cy += (gy - cy) * 0.12;
  glow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
  requestAnimationFrame(animateGlow);
}
animateGlow();

// ============ REVEAL ON SCROLL ============
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
revealEls.forEach((el) => io.observe(el));

// stagger feature cards
document.querySelectorAll('.feature-card').forEach((el) => {
  const i = parseInt(el.style.getPropertyValue('--i') || '0', 10);
  el.style.transitionDelay = `${i * 0.12}s`;
});

// ============ ANIMATED STAT COUNTERS ============
const statTargets = [12400, 100, 9];
const statEls = document.querySelectorAll('.stat-num');
let statsStarted = false;
function startCounters() {
  if (statsStarted) return;
  statsStarted = true;
  statEls.forEach((el, i) => {
    const target = statTargets[i];
    const dur = 1600;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target).toLocaleString('pt-BR');
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
const statsSection = document.querySelector('.hero-stats');
if (statsSection) {
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) startCounters();
  }, { threshold: 0.5 }).observe(statsSection);
}

// ============ GRID / NODE NETWORK CANVAS ============
function initGridCanvas(canvasId, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  let nodes = [];
  const spacing = opts.spacing || 46;
  const linkDist = opts.linkDist || 130;
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.parentElement.offsetWidth;
    h = canvas.parentElement.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildNodes();
  }

  function buildNodes() {
    nodes = [];
    const cols = Math.ceil(w / spacing) + 1;
    const rows = Math.ceil(h / spacing) + 1;
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        nodes.push({
          baseX: x * spacing,
          baseY: y * spacing,
          x: x * spacing,
          y: y * spacing,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  canvas.parentElement.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  canvas.parentElement.addEventListener('mouseleave', () => {
    mouse.x = -9999; mouse.y = -9999;
  });

  let t = 0;
  function draw() {
    t += 0.006;
    ctx.clearRect(0, 0, w, h);

    // faint base grid
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // update node positions (gentle drift)
    nodes.forEach((n) => {
      n.x = n.baseX + Math.sin(t + n.phase) * 6;
      n.y = n.baseY + Math.cos(t + n.phase) * 6;

      const dx = mouse.x - n.x;
      const dy = mouse.y - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 140) {
        const force = (140 - dist) / 140;
        n.x -= dx * force * 0.12;
        n.y -= dy * force * 0.12;
      }
    });

    // links near mouse
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const dxm = mouse.x - n.x, dym = mouse.y - n.y;
      const dm = Math.sqrt(dxm * dxm + dym * dym);
      if (dm < linkDist) {
        const alpha = (1 - dm / linkDist) * 0.5;
        const grad = ctx.createLinearGradient(mouse.x, mouse.y, n.x, n.y);
        grad.addColorStop(0, `rgba(245,112,158,${alpha})`);
        grad.addColorStop(1, `rgba(91,42,140,${alpha * 0.3})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      }
    }

    // dots
    nodes.forEach((n) => {
      const dxm = mouse.x - n.x, dym = mouse.y - n.y;
      const dm = Math.sqrt(dxm * dxm + dym * dym);
      const near = dm < linkDist;
      ctx.beginPath();
      ctx.arc(n.x, n.y, near ? 2.1 : 1.2, 0, Math.PI * 2);
      ctx.fillStyle = near ? 'rgba(245,112,158,0.9)' : 'rgba(255,255,255,0.14)';
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  draw();
}

initGridCanvas('gridCanvas', { spacing: 44, linkDist: 150 });
initGridCanvas('gridCanvas2', { spacing: 44, linkDist: 150 });

// ============ DEEP DIVE TABS ============
const tabSwitch = document.getElementById('tabSwitch');
const tabIndicator = document.getElementById('tabIndicator');
const tabCaption = document.getElementById('tabCaption');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

const tabCaptions = {
  vsl: 'Roteiro completo, direto na dor, sem enrolação — pronto pra gravar.',
  criativos: 'Mesma oferta, adaptada pro tom e formato de cada plataforma.',
  hooks: 'Um hook vira dezenas de ângulos diferentes, sem repetir a mesma ideia.',
};

function moveIndicator(btn) {
  if (!tabIndicator || !btn) return;
  tabIndicator.style.left = btn.offsetLeft + 'px';
  tabIndicator.style.width = btn.offsetWidth + 'px';
}

function restartStagger(panel) {
  const items = panel.querySelectorAll('.fd-point');
  items.forEach((el, i) => {
    el.style.animation = 'none';
    el.style.animationDelay = '';
    void el.offsetWidth; // force reflow
    el.style.animation = '';
    el.style.animationDelay = `${i * 0.08}s`;
  });
}

function activateTab(name, btn) {
  tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
  moveIndicator(btn);
  tabCaption.textContent = tabCaptions[name] || '';

  tabPanels.forEach((p) => p.classList.remove('active'));
  const targetPanel = document.querySelector(`.tab-panel[data-panel="${name}"]`);
  if (targetPanel) {
    void targetPanel.offsetWidth;
    targetPanel.classList.add('active');
    restartStagger(targetPanel);
  }
}

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab, btn));
});

if (tabSwitch) {
  const defaultBtn = document.querySelector('.tab-btn.active') || tabBtns[0];
  requestAnimationFrame(() => moveIndicator(defaultBtn));
  window.addEventListener('resize', () => {
    const activeBtn = document.querySelector('.tab-btn.active');
    moveIndicator(activeBtn);
  }, { passive: true });

  // animate the default (VSL) panel once it scrolls into view
  const deepdiveSection = document.getElementById('demo');
  if (deepdiveSection) {
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        restartStagger(document.querySelector('.tab-panel.active'));
      }
    }, { threshold: 0.3 }).observe(deepdiveSection);
  }
}

// ============ TESTIMONIALS CAROUSEL ============
const testiTrack = document.getElementById('testiTrack');
const testiPrev = document.getElementById('testiPrev');
const testiNext = document.getElementById('testiNext');
const testiDotsWrap = document.getElementById('testiDots');

if (testiTrack && testiDotsWrap) {
  const testiCards = Array.from(testiTrack.children);

  testiCards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'testi-dot';
    dot.setAttribute('aria-label', `Ir pro depoimento ${i + 1}`);
    dot.addEventListener('click', () => scrollToTesti(i));
    testiDotsWrap.appendChild(dot);
  });
  const testiDots = Array.from(testiDotsWrap.children);

  function testiStep() {
    const gap = parseFloat(getComputedStyle(testiTrack).columnGap || '0') || 0;
    return testiCards[0].getBoundingClientRect().width + gap;
  }

  function currentTestiIndex() {
    return Math.round(testiTrack.scrollLeft / testiStep());
  }

  function scrollToTesti(i) {
    const clamped = Math.max(0, Math.min(testiCards.length - 1, i));
    testiTrack.scrollTo({ left: clamped * testiStep(), behavior: 'smooth' });
  }

  function updateTestiUI() {
    const i = currentTestiIndex();
    testiDots.forEach((d, idx) => d.classList.toggle('active', idx === i));
    if (testiPrev) testiPrev.disabled = i <= 0;
    if (testiNext) testiNext.disabled = i >= testiCards.length - 1;
  }

  let testiRaf = null;
  testiTrack.addEventListener('scroll', () => {
    if (testiRaf) cancelAnimationFrame(testiRaf);
    testiRaf = requestAnimationFrame(updateTestiUI);
  }, { passive: true });

  if (testiPrev) testiPrev.addEventListener('click', () => scrollToTesti(currentTestiIndex() - 1));
  if (testiNext) testiNext.addEventListener('click', () => scrollToTesti(currentTestiIndex() + 1));

  window.addEventListener('resize', updateTestiUI, { passive: true });
  updateTestiUI();
}
