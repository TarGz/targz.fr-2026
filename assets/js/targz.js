/* ============================================================
   targz-glitch: the module. Everything on this page runs it.
   ============================================================ */
const TARGZ = (() => {
  const DEFAULTS = { mode:'mark', shift:5, blur:1, scan:0.6, grid:12, pixel:4,
                     ink:'#121212', base:'#FFFFFF', ground:null, crisp:true, clip:'spread',
                     shiftY:null };

  function hexToRgb(h) {
    const n = parseInt(h.replace('#',''), 16);
    return [(n>>16)&255, (n>>8)&255, n&255];
  }

  // Downsample then draw back with smoothing off: chunky pixels.
  function pixelate(cv, factor) {
    if (!factor || factor < 2) return;
    const w = Math.max(1, Math.round(cv.width/factor));
    const h = Math.max(1, Math.round(cv.height/factor));
    const small = document.createElement('canvas');
    small.width = w; small.height = h;
    const sc = small.getContext('2d');
    sc.imageSmoothingEnabled = true;
    sc.drawImage(cv, 0, 0, w, h);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = true;
  }

  // The shadow mask: one RGB triplet per cell, plus a row gap.
  function shadowMask(r, g, b, x, y, k, pitch) {
    const gp = Math.max(3, pitch), third = gp/3, cx = x % gp;
    const sub = cx < third ? 0 : (cx < 2*third ? 1 : 2);
    const gapCol = (cx % third) >= third - 1 ? 0.7 : 1;
    const vGap = ((y % gp) >= gp - Math.max(1, gp/6) ? 0.55 : 1) * gapCol;
    const lift = 55 * k;
    const mR = sub===0?1:0.3, mG = sub===1?1:0.3, mB = sub===2?1:0.3;
    return [
      (r + (sub===0?lift:0)) * (1-k + k*mR) * vGap + (1-vGap)*r*0.4,
      (g + (sub===1?lift:0)) * (1-k + k*mG) * vGap + (1-vGap)*g*0.4,
      (b + (sub===2?lift:0)) * (1-k + k*mB) * vGap + (1-vGap)*b*0.4
    ];
  }

  // Apply in place. Canvas must already hold the artwork.
  function apply(cv, opts = {}) {
    const P = { ...DEFAULTS, ...opts };
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    if (P.pixel) pixelate(cv, P.pixel);

    if (P.blur > 0 && P.mode === 'mark') {
      const tmp = document.createElement('canvas');
      tmp.width = cv.width; tmp.height = cv.height;
      tmp.getContext('2d').drawImage(cv, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.filter = 'blur(' + P.blur + 'px)';
      ctx.drawImage(tmp, 0, 0);
      ctx.filter = 'none';
    }

    const W = cv.width, H = cv.height;
    if (!W || !H) return cv;
    const id = ctx.getImageData(0, 0, W, H);
    const src = new Uint8ClampedArray(id.data);
    const d = id.data;
    const s = Math.round(P.shift);
    // Green carries a vertical offset so that masked mode has something to vary. Clipping to
    // the unshifted glyph makes the mask and the green channel the same sample, which pins
    // green at full and leaves only white, cyan, yellow and green reachable.
    const sy = P.shiftY !== null && P.shiftY !== undefined
      ? Math.round(P.shiftY)
      : (P.clip === 'glyph' ? Math.max(1, Math.round(s / 2)) : 0);
    const [iR, iG, iB] = hexToRgb(P.ink);
    const [bR, bG, bB] = hexToRgb(P.base);
    const clampX = x => Math.min(W-1, Math.max(0, x));
    const clampY = y => Math.min(H-1, Math.max(0, y));

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y*W + x) * 4;
        const iPlus  = (y*W + clampX(x + s)) * 4;
        const iMinus = (y*W + clampX(x - s)) * 4;
        let r, g, b, a;

        if (P.mode === 'image') {
          // Offset the channels themselves: classic chromatic aberration.
          r = src[iPlus];
          g = src[i + 1];
          b = src[iMinus + 2];
          a = src[i + 3];
        } else {
          // Split the ALPHA, then composite toward ink. A channel goes missing,
          // which is what produces cyan and yellow rather than a glow.
          let aR = src[iPlus + 3] / 255;
          let aG = src[(clampY(y + sy) * W + x) * 4 + 3] / 255;
          let aB = src[iMinus + 3] / 255;
          let aC = src[i + 3] / 255;          // unshifted: the glyph itself
          // Hard alpha. Each channel is fully present or fully absent, so a fringe pixel
          // lands on an exact corner (#12FFFF, #FFFF12, #FF1212). Soft alpha greys it out.
          if (P.crisp) {
            aR = aR > 0.5 ? 1 : 0; aG = aG > 0.5 ? 1 : 0;
            aB = aB > 0.5 ? 1 : 0; aC = aC > 0.5 ? 1 : 0;
          }
          // 'spread': alpha is the union of the three shifted masks, so the glyph grows by
          // the shift and the fringe sits outside the original stroke.
          // 'glyph': alpha is the unshifted channel, so the silhouette is exactly the letter
          // and the colour bands fall inside it. The letter masks its own glitch.
          const clipped = P.clip === 'glyph';
          a = clipped ? aC : Math.max(aR, aG, aB);
          if (a === 0) { d[i+3] = 0; continue; }
          const n = clipped ? 1 : a;
          // Each channel travels from base toward ink by its own alpha. A channel that
          // lags behind leaves base showing: that is the fringe.
          r = bR + (iR - bR) * aR / n;
          g = bG + (iG - bG) * aG / n;
          b = bB + (iB - bB) * aB / n;
          a *= 255;
        }

        if (P.scan > 0) [r, g, b] = shadowMask(r, g, b, x, y, P.scan, P.grid);
        d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = a;
      }
    }
    ctx.putImageData(id, 0, 0);

    if (P.ground) {
      const plate = document.createElement('canvas');
      plate.width = W; plate.height = H;
      const pc = plate.getContext('2d');
      pc.fillStyle = P.ground;
      pc.fillRect(0, 0, W, H);
      pc.drawImage(cv, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(plate, 0, 0);
    }
    return cv;
  }

  // --- wordmark geometry, ported from logo-lab-crt.html -------------------
  // Disk erosion by a 3-4 chamfer distance transform: thins strokes evenly.
  function erodeMask(mask, W, H, r) {
    if (r <= 0) return mask;
    const INF = 1 << 29, d = new Int32Array(W * H);
    for (let i = 0; i < d.length; i++) d[i] = mask[i] > 127 ? INF : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y*W + x; if (d[i] === 0) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i-1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i-W] + 3);
        if (x > 0) v = Math.min(v, d[i-W-1] + 4);
        if (x < W-1) v = Math.min(v, d[i-W+1] + 4);
      }
      d[i] = v;
    }
    for (let y = H-1; y >= 0; y--) for (let x = W-1; x >= 0; x--) {
      const i = y*W + x; if (d[i] === 0) continue;
      let v = d[i];
      if (x < W-1) v = Math.min(v, d[i+1] + 3);
      if (y < H-1) {
        v = Math.min(v, d[i+W] + 3);
        if (x < W-1) v = Math.min(v, d[i+W+1] + 4);
        if (x > 0) v = Math.min(v, d[i+W-1] + 4);
      }
      d[i] = v;
    }
    const t = 3 * r, out = new Uint8Array(W * H);
    for (let i = 0; i < out.length; i++) out[i] = d[i] > t ? 255 : 0;
    return out;
  }

  // Builds "Targz Shop": T and S scaled up, z dropped onto the g's descender,
  // the long crossbar drawn by hand. Returns an alpha-only canvas, unglitched.
  function wordmark(opts = {}) {
    const P = { size:600, track:-0.06, tScale:1.03, zAdjust:0.86, erode:11,
                barStart:-0.02, barEnd:0.3, barSlope:0, barLeft:1.3, barRight:0.92,
                ink:'#121212', word:'targz-shop', ...opts };
    const SIZE = P.size, BASE_STROKE = 0.166 * SIZE, PADPX = Math.round(SIZE * 0.25);
    const probe = document.createElement('canvas').getContext('2d');
    const gm = (ch, size) => {
      probe.font = size + 'px Knewave';
      const m = probe.measureText(ch);
      return { adv:m.width, asc:m.actualBoundingBoxAscent, desc:m.actualBoundingBoxDescent,
               left:m.actualBoundingBoxLeft };
    };
    const mA = gm('a', SIZE), mG = gm('g', SIZE), mZ = gm('z', SIZE);
    const kz = ((mG.desc + mA.asc) / (mZ.asc + mZ.desc)) * P.zAdjust;
    const dyZ = -mA.asc + kz * mZ.asc;

    // "Targz" is the artist mark, "Targz Shop" the commerce sub-mark. Same letterforms.
    const chars = [
      ['T', SIZE * P.tScale, 0, 'big'], ['a', SIZE, 0, 'low'], ['r', SIZE, 0, 'low'],
      ['g', SIZE, 0, 'low'], ['z', SIZE * kz, dyZ, 'z']
    ];
    if (P.word !== 'targz') chars.push(
      [' ', SIZE, 0, null],
      ['S', SIZE * P.tScale, 0, 'big'], ['h', SIZE, 0, 'low'], ['o', SIZE, 0, 'low'],
      ['p', SIZE, 0, 'low']
    );
    const track = P.track * SIZE;
    let x = PADPX, maxAsc = 0, maxDesc = 0;
    const placed = [];
    for (const [ch, size, dy, layer] of chars) {
      probe.font = size + 'px Knewave';
      const m = probe.measureText(ch);
      if (layer) {
        placed.push({ ch, size, dy, layer, x });
        maxAsc = Math.max(maxAsc, m.actualBoundingBoxAscent - dy);
        maxDesc = Math.max(maxDesc, m.actualBoundingBoxDescent + dy);
      }
      x += m.width + track;
    }
    const W = Math.ceil(x + PADPX), Y0 = Math.ceil(maxAsc + PADPX);
    const H = Math.ceil(Y0 + maxDesc + PADPX);

    const layers = {};
    for (const name of ['low', 'big', 'z']) {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const cx = c.getContext('2d', { willReadFrequently: true });
      cx.fillStyle = '#fff';
      layers[name] = cx;
    }
    for (const g of placed) {
      if (g.layer === 'z') continue;
      const cx = layers[g.layer];
      cx.font = g.size + 'px Knewave';
      cx.fillText(g.ch, g.x, Y0 + g.dy);
    }

    // the long T crossbar: a tapered quad with rounded caps
    const T = placed[0], rGlyph = placed[2], ctxB = layers.big;
    ctxB.font = T.size + 'px Knewave';
    const mT = ctxB.measureText('T');
    const barH = 0.166 * T.size, hL = barH * P.barLeft, hR = barH * P.barRight;
    const x0 = T.x - mT.actualBoundingBoxLeft + P.barStart * T.size;
    layers.low.font = SIZE + 'px Knewave';
    const x1 = rGlyph.x + layers.low.measureText('r').width + P.barEnd * SIZE;
    const yTop = Y0 - mT.actualBoundingBoxAscent, slope = P.barSlope * (x1 - x0);
    ctxB.beginPath();
    ctxB.moveTo(x0, yTop); ctxB.lineTo(x1, yTop + slope);
    ctxB.lineTo(x1, yTop + slope + hR); ctxB.lineTo(x0, yTop + hL);
    ctxB.closePath(); ctxB.fill();
    ctxB.beginPath(); ctxB.ellipse(x1, yTop + slope + hR/2, hR/2, hR/2, 0, 0, 7); ctxB.fill();
    ctxB.beginPath(); ctxB.ellipse(x0, yTop + hL/2, hL*0.35, hL/2, 0, 0, 7); ctxB.fill();

    const maskOf = name => {
      const d = layers[name].getImageData(0, 0, W, H).data;
      const m = new Uint8Array(W * H);
      for (let i = 0; i < m.length; i++) m[i] = d[i*4 + 3];
      return m;
    };
    const rBase = P.erode;
    const rBig = Math.round(rBase + ((P.tScale - 1) * BASE_STROKE) / 2);
    const low = erodeMask(maskOf('low'), W, H, rBase);
    const big = erodeMask(maskOf('big'), W, H, rBig);

    // z: eroded at base size, then scaled up, so its weight matches the rest
    const zc = placed.find(g => g.layer === 'z');
    const zPad = Math.round(SIZE * 0.14);
    const zW = Math.ceil(mZ.adv + 2*zPad), zH = Math.ceil(mZ.asc + mZ.desc + 2*zPad);
    const zcv = document.createElement('canvas');
    zcv.width = zW; zcv.height = zH;
    const zx = zcv.getContext('2d', { willReadFrequently: true });
    zx.fillStyle = '#fff'; zx.font = SIZE + 'px Knewave';
    zx.fillText('z', zPad, zPad + mZ.asc);
    const zd = zx.getImageData(0, 0, zW, zH).data;
    const zm = new Uint8Array(zW * zH);
    for (let i = 0; i < zm.length; i++) zm[i] = zd[i*4 + 3];
    const ze = erodeMask(zm, zW, zH, rBase);
    const zOut = zx.createImageData(zW, zH);
    const [zR, zG, zB] = hexToRgb(P.ink);   // the z takes the stroke colour like everything else
    for (let i = 0; i < ze.length; i++) {
      zOut.data[i*4] = zR; zOut.data[i*4+1] = zG; zOut.data[i*4+2] = zB;
      zOut.data[i*4+3] = ze[i];
    }
    zx.putImageData(zOut, 0, 0);

    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const oc = out.getContext('2d', { willReadFrequently: true });
    const oid = oc.createImageData(W, H);
    const [kR, kG, kB] = hexToRgb(P.ink);
    for (let i = 0; i < W*H; i++) {
      const a = Math.max(low[i], big[i]);
      oid.data[i*4] = kR; oid.data[i*4+1] = kG; oid.data[i*4+2] = kB; oid.data[i*4+3] = a;
    }
    oc.putImageData(oid, 0, 0);
    oc.drawImage(zcv, zc.x - zPad*kz, Y0 + zc.dy - (zPad + mZ.asc)*kz, zW*kz, zH*kz);
    return out;
  }

  // Draw text, then glitch it. Returns a fresh canvas sized to the text.
  function text(str, opts = {}) {
    const P = { font:'PT Serif', size:120, weight:700, pad:null, erode:0, ...opts };
    const pad = P.pad != null ? P.pad : Math.round(P.size * 0.35);
    const probe = document.createElement('canvas').getContext('2d');
    const fontSpec = P.weight + ' ' + P.size + 'px "' + P.font + '"';
    probe.font = fontSpec;
    const m = probe.measureText(str);
    const asc = m.actualBoundingBoxAscent || P.size * 0.8;
    const desc = m.actualBoundingBoxDescent || P.size * 0.25;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(m.width + pad*2);
    cv.height = Math.ceil(asc + desc + pad*2);
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.font = fontSpec;
    ctx.fillStyle = opts.ink || DEFAULTS.ink;
    ctx.fillText(str, pad, pad + asc);

    // Optional stroke thinning, the same chamfer erosion the mark uses.
    if (P.erode > 0) {
      const W = cv.width, H = cv.height;
      const id = ctx.getImageData(0, 0, W, H);
      const m = new Uint8Array(W * H);
      for (let i = 0; i < m.length; i++) m[i] = id.data[i*4 + 3];
      const e = erodeMask(m, W, H, P.erode);
      for (let i = 0; i < e.length; i++) id.data[i*4 + 3] = e[i];
      ctx.putImageData(id, 0, 0);
    }
    return apply(cv, { ...opts, mode:'mark' });
  }

  // Glitch an already-loaded image. Returns a fresh canvas.
  function image(img, opts = {}) {
    const maxW = opts.maxWidth || 1200;
    // Upscaling is allowed on purpose. The shadow mask is drawn at output
    // resolution and its triplet cannot go below 3px, so the only way to make
    // the grille fine RELATIVE to the picture is to render the picture bigger.
    // Capped at 1 the grille could never get finer than 3px of a 1,100px file.
    const scale = maxW / img.naturalWidth;
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.naturalWidth * scale);
    cv.height = Math.round(img.naturalHeight * scale);
    cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, cv.width, cv.height);
    return apply(cv, { mode:'image', blur:0, scan:0.35, grid:6, ...opts });
  }

  return { DEFAULTS, apply, text, image, wordmark, erodeMask, pixelate, shadowMask };
})();

