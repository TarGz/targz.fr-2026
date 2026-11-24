/* Shared by /hello and /shop-contact: the glitched "Work with me" card (ragged edge,
   plotted arrow, chevron, envelope), the open/close toggle and the form send.
   Needs assets/js/targz.js (loaded by the footer) before it. */
/* Trash the edges like the mark: a ragged, not-quite-rectangular silhouette behind the
   "Work with me" card, and the plotted arrow + chevron, all pushed through the charte's
   glitch (pixelate + channel split). Drawn at 1 CSS px per px so the blocks stay chunky. */
(function () {
  if (typeof TARGZ === 'undefined') return;

  function rand(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function cardGlitch(wrap) {
    var old = wrap.querySelector('.hz-trash'); if (old) old.remove();
    var w = wrap.offsetWidth, h = wrap.offsetHeight, pad = 90, B = 8;
    var cv = document.createElement('canvas');
    cv.className = 'hz-trash';
    cv.width = w + pad * 2; cv.height = h + pad * 2;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var r = rand(7 + w * 3 + h);
    // a skewed quad: each corner pushed out a different amount, so every edge runs on a
    // slight slant and the pixelation turns it into stair steps, like the mark
    var k = function (lo, hi) { return lo + Math.round(r() * (hi - lo)); };
    var pts = [
      [-k(56, 76),     -k(40, 48)],
      [w + k(36, 52),  -k(54, 64)],
      [w + k(56, 76),  h + k(40, 48)],
      [-k(40, 56),     h + k(54, 64)]
    ];
    ctx.translate(pad, pad);
    ctx.beginPath();
    pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.closePath();
    // on a white page the silhouette is ink on paper, like the mark; on black it's the card's grey
    var light = !!wrap.closest('.hz-reach--light');
    var ink = light ? '#121212' : '#F4F3F1', base = light ? '#FFFFFF' : '#0B0B0D';
    ctx.fillStyle = ink;
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    TARGZ.apply(cv, { mode: 'mark', shift: 5, pixel: B, blur: 0, scan: 0,
                      base: base, ink: ink, clip: 'spread' });
    cv.style.left = cv.style.top = (-pad) + 'px';
    wrap.prepend(cv);
  }

  function svgGlitch(svg, opts) {
    var vb = svg.viewBox.baseVal, bb = svg.getBoundingClientRect(), w = Math.round(bb.width), h = Math.round(bb.height);
    if (!w || !h) return;
    var S = opts.scale || 1, pad = opts.pad, cv = document.createElement('canvas');
    cv.width = (w + pad * 2) * S; cv.height = (h + pad * 2) * S;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.translate(pad * S, pad * S);
    ctx.scale(w * S / vb.width, h * S / vb.height);
    ctx.strokeStyle = opts.ink; ctx.lineWidth = opts.stroke * vb.width / w;
    ctx.lineCap = ctx.lineJoin = 'round';
    svg.querySelectorAll('path').forEach(function (p) { ctx.stroke(new Path2D(p.getAttribute('d'))); });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    TARGZ.apply(cv, { mode: 'mark', shift: opts.shift, pixel: opts.pixel, blur: 0, scan: 0,
                      base: opts.base, ink: opts.ink, clip: 'spread' });
    cv.className = svg.getAttribute('class') + ' is-glitch';
    cv.style.width = (w + pad * 2) + 'px'; cv.style.height = (h + pad * 2) + 'px';
    cv.style.margin = (-pad) + 'px';
    svg.replaceWith(cv);
  }

  (function () {
    var wrap = document.querySelector('.hz-reach .hz-work');
    var arrow = document.querySelector('.hz-reach .hz-scribble');
    var chev = document.querySelector('.hz-reach .hz-work-chev');
    var lightPage = !!document.querySelector('.hz-reach--light');
    if (arrow) svgGlitch(arrow, { pad: 12, stroke: 5, pixel: 5, shift: 4,
                                  ink: lightPage ? '#121212' : '#FFFFFF', base: lightPage ? '#FFFFFF' : '#0B0B0D' });
    var mail = document.querySelector('.hz-reach .hz-mail');
    if (mail) svgGlitch(mail, { pad: 6, stroke: 2, scale: 3, pixel: 2, shift: 2, ink: '#FFFFFF', base: '#0B0B0D' });
    if (chev) svgGlitch(chev, { pad: 6, stroke: 3, pixel: 3, shift: 2, ink: '#121212', base: '#F4F3F1' });
    if (!wrap) return;
    cardGlitch(wrap);
    // the card grows when the form opens: redraw the silhouette to fit
    if (window.ResizeObserver) {
      var last = wrap.offsetHeight + 'x' + wrap.offsetWidth;
      new ResizeObserver(function () {
        var now = wrap.offsetHeight + 'x' + wrap.offsetWidth;
        if (now !== last) { last = now; cardGlitch(wrap); }
      }).observe(wrap);
    }
  })();
})();

document.addEventListener('DOMContentLoaded', function () {
  function track(name, params) {
    if (typeof gtag === 'function') gtag('event', name, params);
  }

  // GA event prefix per page: <body data-ga="hello"> -> hello_click / hello_form_sent
  var ga = document.body.dataset.ga || 'hello';

  var workBtn = document.querySelector('button.hz-work-btn');
  var workPanel = document.getElementById('hz-form');
  if (workBtn) workBtn.addEventListener('click', function () {
    var open = workBtn.getAttribute('aria-expanded') !== 'true';
    workBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    workPanel.hidden = !open;
    if (open) workPanel.querySelector('input').focus({ preventScroll: true });
  });

  document.querySelectorAll('[data-target]').forEach(function (link) {
    link.addEventListener('click', function () {
      track(ga + '_click', { target: link.dataset.target });
    });
  });
  document.querySelectorAll('.hz-socials a').forEach(function (link) {
    link.addEventListener('click', function () {
      track(ga + '_click', { target: (link.title || 'social').toLowerCase() });
    });
  });

  var form = document.querySelector('#hz-form form');
  if (!form) return;
  var status = document.querySelector('.hz-form-status');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var button = form.querySelector('button');
    button.disabled = true;
    status.textContent = 'Sending…';
    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      track(ga + '_form_sent', {});
      form.reset();
      // swap the form for a clear confirmation, panel stays open
      workPanel.innerHTML = '<div class="hz-sent"><strong>Message sent.</strong><span>I’ll answer fast.</span></div>';
    }).catch(function () {
      status.textContent = 'That didn’t go through. Try again, or write to me on Instagram.';
    }).finally(function () {
      button.disabled = false;
    });
  });
});
